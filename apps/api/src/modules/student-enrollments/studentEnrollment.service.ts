// apps/api/src/modules/student-enrollments/studentEnrollment.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { studentEnrollmentLogger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { admissionRepository } from '../admissions/admission.repository.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';

import { toStudentEnrollmentDTO, toStudentEnrollmentDTOList } from './studentEnrollment.mapper.js';
import { studentEnrollmentRepository } from './studentEnrollment.repository.js';
import type {
  CancelStudentEnrollmentInput,
  CreateStudentEnrollmentInput,
  ListStudentEnrollmentsFilters,
  ListStudentEnrollmentsOptions,
  ListStudentEnrollmentsResult,
  StudentEnrollmentDTO,
  StudentEnrollmentId,
  UpdateStudentEnrollmentInput,
  WithdrawStudentEnrollmentInput,
} from './studentEnrollment.types.js';

/**
 * Business-logic layer for the StudentEnrollment domain.
 *
 * Key invariants this service enforces:
 * 1. Admission is the source of truth — userId/programId/
 *    curriculumVersionId/admissionDate are derived from the referenced
 *    Admission at creation time and never accepted from the caller.
 * 2. userId is NOT unique on this model — a user may accumulate multiple
 *    StudentEnrollment rows over a lifetime (one per Admission).
 * 3. At most one ACTIVE row per user is backed by a Postgres partial
 *    unique index (student_enrollments_one_active_per_user_idx), not by
 *    anything checked here. Every uniqueness check in this service
 *    (admission, roll number, active-user) is a fast-path pre-check only;
 *    the database constraints are final, and a P2002 from any of them is
 *    left to propagate to the centralized Prisma-error-handling
 *    middleware — this service does not catch Prisma errors directly,
 *    matching AdmissionService/AcademicYearService/RoleAssignmentService.
 * 4. Lifecycle transitions (ACTIVE -> CANCELLED, ACTIVE -> WITHDRAWN) use
 *    the repository's atomic conditional updateMany operations, never a
 *    read-then-write. There is no generic status setter and no delete.
 * 5. Cancellation is additionally blocked once academic activity exists
 *    (see cancelStudentEnrollment); withdrawal has no such guard.
 *
 * create/update/cancel/withdraw each run inside one prisma.$transaction
 * and re-read their target row via the repository's *Tx methods within
 * that same transaction, mirroring AdmissionService/AcademicYearService.
 * getStudentEnrollmentById/listStudentEnrollments are plain, unaudited
 * reads with no transaction.
 *
 * Audit: recordAuditTx runs inside the same transaction as each mutation.
 * CANCEL/WITHDRAW are recorded with action 'UPDATE' — AuditAction has no
 * dedicated CANCEL/WITHDRAW value, and AdmissionService uses the same
 * 'UPDATE' action for its own CONFIRMED -> CANCELLED transition. Entity
 * type reuses AuditEntityType.STUDENT; there is no dedicated
 * StudentEnrollment value yet (see final report).
 */
export class StudentEnrollmentService {
  /**
   * Creates a StudentEnrollment from a CONFIRMED Admission that does not
   * already have one, for a user with no other ACTIVE enrollment.
   */
  async createStudentEnrollment(
    actorUserId: string,
    input: CreateStudentEnrollmentInput,
  ): Promise<StudentEnrollmentDTO> {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const admission = await admissionRepository.findByIdTx(tx, input.admissionId);
      if (!admission) {
        throw ApiError.notFound('Admission not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (admission.status === 'CANCELLED') {
        throw ApiError.unprocessable(
          'A cancelled admission cannot produce a student enrollment',
          ErrorCode.ADMISSION_CANCELLED_PROTECTED,
        );
      }

      const existingForAdmission = await studentEnrollmentRepository.findByAdmissionIdTx(
        tx,
        admission.id,
      );
      if (existingForAdmission) {
        throw ApiError.conflict(
          'This admission has already produced a student enrollment',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      const activeForUser = await studentEnrollmentRepository.findActiveByUserIdTx(
        tx,
        admission.userId,
      );
      if (activeForUser) {
        throw ApiError.conflict(
          'This user already has an active student enrollment',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      // Fast-path pre-check only, mirroring AdmissionService's
      // existsByAdmissionNumber check — @@unique([rollNumber]) is final.
      const rollNumberTaken = await studentEnrollmentRepository.findByRollNumberTx(
        tx,
        input.rollNumber,
      );
      if (rollNumberTaken) {
        throw ApiError.conflict(
          'This roll number is already assigned to another student enrollment',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      const result = await studentEnrollmentRepository.create(tx, {
        admissionId: admission.id,
        userId: admission.userId,
        programId: admission.initialProgramId,
        curriculumVersionId: admission.initialCurriculumId,
        rollNumber: input.rollNumber,
        admissionDate: admission.admissionDate,
      });

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.STUDENT,
        entityId: result.id,
        newValue: {
          id: result.id,
          admissionId: result.admissionId,
          userId: result.userId,
          programId: result.programId,
          curriculumVersionId: result.curriculumVersionId,
          rollNumber: result.rollNumber,
          admissionDate: result.admissionDate.toISOString(),
          status: result.status,
        },
      });

      return result;
    });

    studentEnrollmentLogger.info('Student enrollment created', {
      actorUserId,
      studentEnrollmentId: created.id,
      admissionId: created.admissionId,
    });

    return toStudentEnrollmentDTO(created);
  }

  /** Not audited — routine read. */
  async getStudentEnrollmentById(id: StudentEnrollmentId): Promise<StudentEnrollmentDTO> {
    const enrollment = await studentEnrollmentRepository.findById(id);
    if (!enrollment) {
      throw ApiError.notFound('Student enrollment not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toStudentEnrollmentDTO(enrollment);
  }

  /** Not audited — routine read. */
  async listStudentEnrollments(
    filters: ListStudentEnrollmentsFilters,
    options: ListStudentEnrollmentsOptions,
  ): Promise<ListStudentEnrollmentsResult> {
    const result = await studentEnrollmentRepository.list(filters, options);
    return {
      studentEnrollments: toStudentEnrollmentDTOList(result.studentEnrollments),
      total: result.total,
    };
  }

  /**
   * Updates rollNumber only — every other field is structurally
   * unreachable through UpdateStudentEnrollmentInput. A request with
   * rollNumber unset, or equal to the current value, is a no-op: no
   * write, no audit row, no "updated" log line.
   *
   * This does not restrict updates by lifecycle status (e.g. a CANCELLED
   * or WITHDRAWN enrollment's roll number can still be corrected). No
   * sibling module or documented rule establishes whether historical
   * enrollments' roll numbers should be immutable — this preserves the
   * current permissive behavior rather than guessing a new restriction;
   * see final report.
   */
  async updateStudentEnrollment(
    actorUserId: string,
    id: StudentEnrollmentId,
    input: UpdateStudentEnrollmentInput,
  ): Promise<StudentEnrollmentDTO> {
    const { entity, mutated } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await studentEnrollmentRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Student enrollment not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (input.rollNumber === undefined || input.rollNumber === existing.rollNumber) {
        return { entity: existing, mutated: false as const };
      }

      const conflicting = await studentEnrollmentRepository.findByRollNumberTx(
        tx,
        input.rollNumber,
      );
      if (conflicting && conflicting.id !== id) {
        throw ApiError.conflict(
          'This roll number is already assigned to another student enrollment',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      const updated = await studentEnrollmentRepository.update(tx, id, {
        rollNumber: input.rollNumber,
      });

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.STUDENT,
        entityId: existing.id,
        oldValue: { rollNumber: existing.rollNumber },
        newValue: { rollNumber: updated.rollNumber },
      });

      return { entity: updated, mutated: true as const };
    });

    if (mutated) {
      studentEnrollmentLogger.info('Student enrollment updated', {
        actorUserId,
        studentEnrollmentId: entity.id,
      });
    }

    return toStudentEnrollmentDTO(entity);
  }

  /**
   * ACTIVE -> CANCELLED. Cancellation means the enrollment should never
   * have become academically active, so it is blocked once any academic
   * activity exists (unlike withdrawal, which has no such guard).
   */
  async cancelStudentEnrollment(
    actorUserId: string,
    id: StudentEnrollmentId,
    input: CancelStudentEnrollmentInput,
  ): Promise<StudentEnrollmentDTO> {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await studentEnrollmentRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Student enrollment not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (existing.status !== 'ACTIVE') {
        throw ApiError.conflict(
          'Only an active student enrollment can be cancelled',
          ErrorCode.STUDENT_ENROLLMENT_NOT_ACTIVE,
        );
      }

      /**
       * Every currently-implemented academic record (AttendanceRecord,
       * AssignmentSubmission, StudentElectiveSelection, PromotionDecision)
       * is reachable only via a SemesterEnrollment row, so a zero count
       * here rules out all of them. No SemesterEnrollmentRepository
       * exists yet, so this queries the model directly through `tx` as a
       * narrowly-scoped, temporary exception to the service/repository
       * boundary — it should move behind a SemesterEnrollment repository
       * once one exists.
       */
      const academicActivityCount = await tx.semesterEnrollment.count({
        where: { studentEnrollmentId: id },
      });
      if (academicActivityCount > 0) {
        throw ApiError.conflict(
          'This student enrollment already has academic records and can no longer be cancelled',
          ErrorCode.STUDENT_ENROLLMENT_HAS_ACADEMIC_RECORDS,
        );
      }

      const cancelled = await studentEnrollmentRepository.cancel(tx, id, input.reason);
      if (!cancelled) {
        // The conditional update matched no row. This service confirmed
        // ACTIVE status moments earlier within this same transaction and
        // there is no delete operation on this model, so the most likely
        // explanation is a concurrent cancel/withdraw committing in
        // between — re-read to report the current state rather than
        // assume why the update matched nothing.
        const current = await studentEnrollmentRepository.findByIdTx(tx, id);
        if (!current) {
          throw ApiError.notFound('Student enrollment not found', ErrorCode.RECORD_NOT_FOUND);
        }
        throw ApiError.conflict(
          'Only an active student enrollment can be cancelled',
          ErrorCode.STUDENT_ENROLLMENT_NOT_ACTIVE,
        );
      }

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.STUDENT,
        entityId: existing.id,
        oldValue: { status: existing.status },
        newValue: { status: cancelled.status, statusReason: cancelled.statusReason },
      });

      return cancelled;
    });

    studentEnrollmentLogger.info('Student enrollment cancelled', {
      actorUserId,
      studentEnrollmentId: result.id,
    });

    return toStudentEnrollmentDTO(result);
  }

  /**
   * ACTIVE -> WITHDRAWN. A legitimate enrollment may be withdrawn even
   * after academic activity exists, so unlike cancellation there is no
   * academic-activity guard. Withdrawal is terminal for this row — it
   * never creates a new Admission or StudentEnrollment.
   */
  async withdrawStudentEnrollment(
    actorUserId: string,
    id: StudentEnrollmentId,
    input: WithdrawStudentEnrollmentInput,
  ): Promise<StudentEnrollmentDTO> {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await studentEnrollmentRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Student enrollment not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (existing.status !== 'ACTIVE') {
        throw ApiError.conflict(
          'Only an active student enrollment can be withdrawn',
          ErrorCode.STUDENT_ENROLLMENT_NOT_ACTIVE,
        );
      }

      const withdrawn = await studentEnrollmentRepository.withdraw(tx, id, input.reason);
      if (!withdrawn) {
        // See cancelStudentEnrollment's equivalent comment above.
        const current = await studentEnrollmentRepository.findByIdTx(tx, id);
        if (!current) {
          throw ApiError.notFound('Student enrollment not found', ErrorCode.RECORD_NOT_FOUND);
        }
        throw ApiError.conflict(
          'Only an active student enrollment can be withdrawn',
          ErrorCode.STUDENT_ENROLLMENT_NOT_ACTIVE,
        );
      }

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.STUDENT,
        entityId: existing.id,
        oldValue: { status: existing.status },
        newValue: { status: withdrawn.status, statusReason: withdrawn.statusReason },
      });

      return withdrawn;
    });

    studentEnrollmentLogger.info('Student enrollment withdrawn', {
      actorUserId,
      studentEnrollmentId: result.id,
    });

    return toStudentEnrollmentDTO(result);
  }
}

export const studentEnrollmentService = new StudentEnrollmentService();
