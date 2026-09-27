// apps/api/src/modules/faculty-assignments/facultyAssignment.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { facultyAssignmentLogger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';
import { authorizationService } from '../rbac/authorization/authorization.service.js';
import { subjectOfferingRepository } from '../subject-offerings/subjectOffering.repository.js';
import { userRepository } from '../user/user.repository.js';

import { toFacultyAssignmentDTO, toFacultyAssignmentDTOList } from './facultyAssignment.mapper.js';
import { facultyAssignmentRepository } from './facultyAssignment.repository.js';
import type {
  CreateFacultyAssignmentInput,
  FacultyAssignmentDTO,
  FacultyAssignmentId,
  ListFacultyAssignmentsFilters,
  ListFacultyAssignmentsOptions,
  ListFacultyAssignmentsResult,
} from './facultyAssignment.types.js';

/**
 * Business-logic layer for the FacultyAssignment domain.
 *
 * A FacultyAssignment answers "which faculty member teaches which
 * component of this SubjectOffering" (see facultyAssignment.types.ts's
 * file header for the full domain framing). This service enforces the
 * invariants the schema itself says it cannot express as plain foreign
 * keys — see the two NOTE comments on the `FacultyAssignment` model in
 * schema.prisma, both reproduced here as the checks below:
 *
 * 1. The referenced SubjectOffering must exist.
 * 2. The referenced SubjectComponent must exist.
 * 3. That SubjectComponent must belong to the SAME Subject as the
 *    SubjectOffering (`subjectComponent.subjectId ===
 *    subjectOffering.subjectId`) — a two-hop agreement check no foreign
 *    key can express, the identical class of check
 *    SemesterEnrollmentService performs between SemesterCatalog and
 *    StudentEnrollment's curriculumVersionId.
 * 4. The referenced faculty User must exist.
 * 5. No FacultyAssignment may already exist for the same
 *    `(subjectOfferingId, subjectComponentId)` pair — mirrored by the
 *    schema's `@@unique([subjectOfferingId, subjectComponentId])`.
 *
 * NOT enforced here — faculty-role eligibility (schema.prisma's own
 * comment: "does not verify facultyUserId holds a faculty-capable role
 * ... Enforce via the RBAC service at assignment time"). This service
 * deliberately does NOT add that check: `user.repository.ts` lists
 * `hasRole(userId, roleKey, scope)` as an explicitly unimplemented RBAC
 * extension point, and no role-key constant identifying "faculty-capable"
 * exists anywhere in this codebase's RBAC module (permission catalog,
 * role bootstrap, or otherwise). Implementing it here would mean this
 * service inventing that role-key convention itself — exactly the kind of
 * silent architecture invention this task is scoped to avoid. Once the
 * RBAC module exposes a real "does this user hold a faculty-capable role"
 * primitive, it belongs here, immediately after the faculty-user-exists
 * check below.
 *
 * NOT enforced here — actor authorization. Every sibling service that
 * lacks a privilege-escalation concern (SubjectOfferingService,
 * SemesterEnrollmentService, StudentEnrollmentService) performs no
 * service-level `authorize()` call; that is the controller/route
 * middleware's job (`authorize(resource, action)` in the corresponding
 * `*.routes.ts`). Only RoleAssignmentService/PermissionService add a
 * service-level guard, and only because handing out a role/permission is
 * a privilege-escalation risk the middleware's coarse
 * resource:action check cannot see — assigning a faculty member to teach
 * a subject component carries no equivalent risk. `actorUserId` is
 * therefore used here only to attribute the audit record, matching this
 * majority pattern.
 *
 * `createFacultyAssignment` runs inside one `prisma.$transaction`,
 * re-reading SubjectOffering/the duplicate check via `*Tx` repository
 * methods within that same transaction (never a pre-fetch outside it),
 * with the audit write in the same transaction — matching every sibling
 * service's shape exactly. The SubjectComponent existence/relationship
 * check and the faculty User existence check are also performed inside
 * this transaction, for the same read-consistency reason.
 *
 * SubjectComponent has no repository yet (confirmed by
 * facultyAssignment.types.ts's own file header: no
 * `academic/subject-components/` module exists in this codebase). This
 * service queries `tx.subjectComponent` directly as a narrowly-scoped,
 * temporary exception to the service/repository boundary — mirroring
 * `StudentEnrollmentService.cancelStudentEnrollment`'s identical
 * "no repository yet" exception for `SemesterEnrollment`. This should
 * move behind a proper `SubjectComponentRepository` once one exists.
 *
 * The existence checks and the duplicate pre-check are all fast-path
 * conveniences for a deterministic 404/409 response, not the concurrency
 * guarantee — same posture as every sibling service. The database's
 * `@@unique([subjectOfferingId, subjectComponentId])` constraint remains
 * the final authority: two concurrent transactions can both pass the
 * pre-check, and the losing `create()` call surfaces a P2002 that this
 * service does not catch, left to propagate to the centralized
 * Prisma-error-handling middleware, matching every sibling service's
 * identical choice not to translate Prisma errors at this layer.
 *
 * No `updateFacultyAssignment`/`deleteFacultyAssignment`.
 * `facultyAssignment.types.ts` defines no `UpdateFacultyAssignmentInput`,
 * and `facultyAssignment.repository.ts` exposes no `update`/`delete`
 * methods. `subjectOfferingId`, `subjectComponentId`, and
 * `facultyUserId` are the only three fields this model has beyond
 * id/timestamps, and all three are referenced by id from
 * `Timetable`/`Lecture` the moment any scheduling/teaching activity
 * exists, so reassigning any of them afterward would retroactively move
 * already-scheduled/already-taught history onto a different
 * offering/component/faculty member. There is nothing left for a generic
 * PATCH/delete to touch, and this service does not invent one — matching
 * the identical reasoning `SubjectOfferingService` documents for its own
 * absent update/delete.
 *
 * `getFacultyAssignmentById`/`listFacultyAssignments` are plain,
 * unaudited reads with no transaction, matching every sibling service's
 * identical read methods. `list` is a thin pass-through; filtering,
 * pagination, and sorting all happen in `facultyAssignmentRepository.list`.
 */
export class FacultyAssignmentService {
  async createFacultyAssignment(
    actorUserId: string,
    input: CreateFacultyAssignmentInput,
  ): Promise<FacultyAssignmentDTO> {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const subjectOffering = await subjectOfferingRepository.findByIdTx(
        tx,
        input.subjectOfferingId,
      );
      if (!subjectOffering) {
        throw ApiError.notFound('Subject offering not found', ErrorCode.RECORD_NOT_FOUND);
      }

      // See the class header's "SubjectComponent has no repository yet"
      // note — this is a documented, temporary exception to the
      // service/repository boundary, not a bypass of an existing one.
      const subjectComponent = await tx.subjectComponent.findUnique({
        where: { id: input.subjectComponentId },
      });
      if (!subjectComponent) {
        throw ApiError.notFound('Subject component not found', ErrorCode.RECORD_NOT_FOUND);
      }

      // Two-hop agreement check no foreign key can express — see the
      // class header's invariant #3. Reuses ACADEMIC_HIERARCHY_MISMATCH,
      // the same ErrorCode SemesterEnrollmentService uses for its
      // structurally identical SemesterCatalog/StudentEnrollment
      // curriculum-agreement check; no dedicated code exists for this
      // specific mismatch.
      if (subjectComponent.subjectId !== subjectOffering.subjectId) {
        throw ApiError.unprocessable(
          'This subject component does not belong to the subject offering\u2019s subject',
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }

      // Scope validation: Ensure actor has authority over the department of the target offering
      const subjectWithDept = await tx.subject.findUnique({
        where: { id: subjectOffering.subjectId },
        include: {
          semesterCatalog: {
            include: {
              curriculumVersion: {
                include: {
                  program: true,
                },
              },
            },
          },
        },
      });

      const targetDepartmentId =
        subjectWithDept?.semesterCatalog.curriculumVersion.program.departmentId;

      if (targetDepartmentId) {
        const collegeCheck = await authorizationService.check({
          subject: { userId: actorUserId },
          resource: 'facultyAssignment',
          action: 'create',
          scope: { type: 'COLLEGE' },
        });

        if (!collegeCheck.decision.allowed) {
          const deptCheck = await authorizationService.check({
            subject: { userId: actorUserId },
            resource: 'facultyAssignment',
            action: 'create',
            scope: { type: 'DEPARTMENT', departmentId: targetDepartmentId },
          });

          if (!deptCheck.decision.allowed) {
            throw ApiError.forbidden(
              'You cannot assign faculty to subjects outside your department',
              ErrorCode.FORBIDDEN_SCOPE,
            );
          }
        }
      }

      // Read-only — per user.repository.ts's own doc comment, read
      // methods intentionally use the singleton client since there is
      // nothing to keep atomic with a read; no findByIdTx exists.
      const facultyUser = await userRepository.findById(input.facultyUserId);
      if (!facultyUser) {
        throw ApiError.notFound('Faculty user not found', ErrorCode.RECORD_NOT_FOUND);
      }

      // See the class header's "NOT enforced here — faculty-role
      // eligibility" note: no RBAC primitive exists yet to check this.

      const existing =
        await facultyAssignmentRepository.findBySubjectOfferingIdAndSubjectComponentIdTx(
          tx,
          input.subjectOfferingId,
          input.subjectComponentId,
        );
      if (existing) {
        throw ApiError.conflict(
          'A faculty assignment already exists for this subject offering and component',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      const assignment = await facultyAssignmentRepository.create(tx, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.FACULTY,
        entityId: assignment.id,
        newValue: {
          id: assignment.id,
          subjectOfferingId: assignment.subjectOfferingId,
          subjectComponentId: assignment.subjectComponentId,
          facultyUserId: assignment.facultyUserId,
        },
      });

      return assignment;
    });

    facultyAssignmentLogger.info('Faculty assignment created', {
      actorUserId,
      facultyAssignmentId: created.id,
      subjectOfferingId: created.subjectOfferingId,
      subjectComponentId: created.subjectComponentId,
      facultyUserId: created.facultyUserId,
    });

    return toFacultyAssignmentDTO(created);
  }

  /**
   * Retrieves a faculty assignment by ID with resource-level authorization.
   *
   * Authorization rules:
   * 1. COLLEGE-level scope (Admin, Super Admin, Principal): Allowed for any assignment.
   * 2. DEPARTMENT-level scope (HOD): Allowed for assignments in their assigned department if they have management authority (facultyAssignment:create).
   * 3. Faculty ownership: Regular faculty holding facultyAssignment:read without manage authority can ONLY access assignments where facultyUserId matches actorUserId.
   *
   * Cross-department and unauthorized cross-faculty access returns 403 FORBIDDEN_SCOPE.
   */
  async getFacultyAssignmentById(
    actorUserId: string,
    id: FacultyAssignmentId,
  ): Promise<FacultyAssignmentDTO> {
    const assignment = await facultyAssignmentRepository.findByIdWithDetails(id);
    if (!assignment) {
      throw ApiError.notFound('Faculty assignment not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const targetDepartmentId =
      assignment.subjectOffering.subject.semesterCatalog.curriculumVersion.program.departmentId;

    // 1. College-level scope check (Admin, Super Admin, Principal, etc.)
    const collegeCheck = await authorizationService.check({
      subject: { userId: actorUserId },
      resource: 'facultyAssignment',
      action: 'read',
      scope: { type: 'COLLEGE' },
    });

    if (collegeCheck.decision.allowed) {
      return toFacultyAssignmentDTO(assignment);
    }

    // 2. Department-level scope check
    if (!targetDepartmentId) {
      throw ApiError.forbidden(
        'Faculty assignment does not belong to a department',
        ErrorCode.FORBIDDEN_SCOPE,
      );
    }

    const deptCheck = await authorizationService.check({
      subject: { userId: actorUserId },
      resource: 'facultyAssignment',
      action: 'read',
      scope: { type: 'DEPARTMENT', departmentId: targetDepartmentId },
    });

    if (!deptCheck.decision.allowed) {
      throw ApiError.forbidden(
        'You do not have access to faculty assignments outside your department',
        ErrorCode.FORBIDDEN_SCOPE,
      );
    }

    // 3. Faculty ownership vs Management authority:
    // If the actor has management authority in the department (facultyAssignment:create, e.g. HOD),
    // they can view any assignment in their department.
    // If the actor is a regular faculty member without create permission, they can ONLY view their own assignment.
    const canManageDept = await authorizationService.check({
      subject: { userId: actorUserId },
      resource: 'facultyAssignment',
      action: 'create',
      scope: { type: 'DEPARTMENT', departmentId: targetDepartmentId },
    });

    if (!canManageDept.decision.allowed) {
      if (assignment.facultyUserId !== actorUserId) {
        throw ApiError.forbidden(
          'You can only access your own faculty assignments',
          ErrorCode.FORBIDDEN_SCOPE,
        );
      }
    }

    return toFacultyAssignmentDTO(assignment);
  }

  /** Not audited — routine read. Thin pass-through; the repository owns filtering/pagination/sorting. */
  async listFacultyAssignments(
    filters: ListFacultyAssignmentsFilters,
    options: ListFacultyAssignmentsOptions,
  ): Promise<ListFacultyAssignmentsResult> {
    const result = await facultyAssignmentRepository.list(filters, options);
    return {
      facultyAssignments: toFacultyAssignmentDTOList(result.facultyAssignments),
      total: result.total,
    };
  }
}

export const facultyAssignmentService = new FacultyAssignmentService();
