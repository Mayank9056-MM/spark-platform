// apps/api/src/modules/academic/subjects/subject.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { subjectLogger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import { assertSemesterStructureMutableTx } from '../curricula/curriculum.guard.js';
import { electiveGroupRepository } from '../electives/elective.repository.js';

import { toSubjectDTO, toSubjectDTOList } from './subject.mapper.js';
import { subjectRepository } from './subject.repository.js';
import type {
  CreateSubjectInput,
  ElectiveGroupId,
  ListSubjectsFilters,
  ListSubjectsOptions,
  ListSubjectsResult,
  SubjectDTO,
  SubjectId,
  UpdateSubjectInput,
} from './subject.types.js';

/**
 * Business-logic layer for the Subject domain.
 *
 * Every mutation (create, update, delete) begins with
 * `assertSemesterStructureMutableTx`, inside the write transaction:
 *   1. the semester exists
 *   2. its CurriculumVersion is DRAFT (ACTIVE/RETIRED = frozen structure,
 *      409 CURRICULUM_VERSION_STRUCTURE_FROZEN) — the primary rule
 *   3. the semester has no academic history (409 SEMESTER_CATALOG_HISTORICAL)
 *      — a secondary safety net
 *
 * Also enforced: a Subject's `electiveGroupId`, when set, must belong to the
 * SAME semester catalog (422 ACADEMIC_HIERARCHY_MISMATCH). `semesterCatalogId`
 * is immutable — there is no operation for moving a subject between
 * semesters. `isElective`/`electiveGroupId` agreement is intentionally not
 * enforced (no established rule).
 *
 * All checks that decide the outcome run in-transaction. `@@unique
 * ([semesterCatalogId, code])` is the final duplicate guarantee (P2002 -> 409).
 */
export class SubjectService {
  async createSubject(actorUserId: string, input: CreateSubjectInput): Promise<SubjectDTO> {
    const subject = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await assertSemesterStructureMutableTx(tx, input.semesterCatalogId);

      if (input.electiveGroupId !== undefined) {
        await this.assertElectiveGroupBelongsToSemesterCatalogTx(
          tx,
          input.electiveGroupId,
          input.semesterCatalogId,
        );
      }

      const codeTaken = await subjectRepository.findBySemesterCatalogAndCodeTx(
        tx,
        input.semesterCatalogId,
        input.code,
      );
      if (codeTaken) {
        throw ApiError.conflict(
          'A subject with this code already exists in this semester catalog',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      const created = await subjectRepository.create(tx, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.SUBJECT,
        entityId: created.id,
        newValue: {
          id: created.id,
          semesterCatalogId: created.semesterCatalogId,
          electiveGroupId: created.electiveGroupId,
          code: created.code,
          name: created.name,
          isElective: created.isElective,
        },
      });

      return created;
    });

    subjectLogger.info('Subject created', {
      actorUserId,
      subjectId: subject.id,
      semesterCatalogId: subject.semesterCatalogId,
    });

    return toSubjectDTO(subject);
  }

  async getSubjectById(id: SubjectId): Promise<SubjectDTO> {
    const subject = await subjectRepository.findById(id);
    if (!subject) {
      throw ApiError.notFound('Subject not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toSubjectDTO(subject);
  }

  async listSubjects(
    filters: ListSubjectsFilters,
    options: ListSubjectsOptions,
  ): Promise<ListSubjectsResult> {
    const result = await subjectRepository.findMany(filters, options);
    return { subjects: toSubjectDTOList(result.subjects), total: result.total };
  }

  /**
   * Updates `code`, `name`, `electiveGroupId`, `isElective`. The effective
   * post-update `electiveGroupId` distinguishes omitted (`undefined`, keep),
   * `null` (clear) and an id (reassign); a non-null, changed value must
   * belong to this subject's own semester.
   */
  async updateSubject(
    actorUserId: string,
    id: SubjectId,
    input: UpdateSubjectInput,
  ): Promise<SubjectDTO> {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await subjectRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Subject not found', ErrorCode.RECORD_NOT_FOUND);
      }

      await assertSemesterStructureMutableTx(tx, existing.semesterCatalogId);

      const effectiveElectiveGroupId =
        input.electiveGroupId === undefined ? existing.electiveGroupId : input.electiveGroupId;

      if (
        effectiveElectiveGroupId !== null &&
        effectiveElectiveGroupId !== existing.electiveGroupId
      ) {
        await this.assertElectiveGroupBelongsToSemesterCatalogTx(
          tx,
          effectiveElectiveGroupId,
          existing.semesterCatalogId,
        );
      }

      if (input.code !== undefined && input.code !== existing.code) {
        const conflicting = await subjectRepository.findBySemesterCatalogAndCodeTx(
          tx,
          existing.semesterCatalogId,
          input.code,
        );
        if (conflicting && conflicting.id !== id) {
          throw ApiError.conflict(
            'A subject with this code already exists in this semester catalog',
            ErrorCode.DUPLICATE_ENTRY,
          );
        }
      }

      const result = await subjectRepository.update(tx, id, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.SUBJECT,
        entityId: existing.id,
        oldValue: {
          semesterCatalogId: existing.semesterCatalogId,
          electiveGroupId: existing.electiveGroupId,
          code: existing.code,
          name: existing.name,
          isElective: existing.isElective,
        },
        newValue: {
          semesterCatalogId: result.semesterCatalogId,
          electiveGroupId: result.electiveGroupId,
          code: result.code,
          name: result.name,
          isElective: result.isElective,
        },
      });

      return result;
    });

    subjectLogger.info('Subject updated', {
      actorUserId,
      subjectId: updated.id,
      semesterCatalogId: updated.semesterCatalogId,
    });

    return toSubjectDTO(updated);
  }

  /**
   * Hard delete, only while the structure is mutable. Rows referencing the
   * subject (components, offerings, elective selections) still make Postgres
   * reject the delete (Restrict) — nothing cascades.
   */
  async deleteSubject(actorUserId: string, id: SubjectId): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await subjectRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Subject not found', ErrorCode.RECORD_NOT_FOUND);
      }

      await assertSemesterStructureMutableTx(tx, existing.semesterCatalogId);

      await subjectRepository.delete(tx, id);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'DELETE',
        entityType: AuditEntityType.SUBJECT,
        entityId: existing.id,
        oldValue: {
          id: existing.id,
          semesterCatalogId: existing.semesterCatalogId,
          electiveGroupId: existing.electiveGroupId,
          code: existing.code,
          name: existing.name,
          isElective: existing.isElective,
        },
        newValue: null,
      });
    });

    subjectLogger.info('Subject deleted', { actorUserId, subjectId: id });
  }

  private async assertElectiveGroupBelongsToSemesterCatalogTx(
    tx: Prisma.TransactionClient,
    electiveGroupId: ElectiveGroupId,
    semesterCatalogId: string,
  ): Promise<void> {
    const electiveGroup = await electiveGroupRepository.findByIdTx(tx, electiveGroupId);
    if (!electiveGroup) {
      throw ApiError.notFound('Elective group not found', ErrorCode.RECORD_NOT_FOUND);
    }
    if (electiveGroup.semesterCatalogId !== semesterCatalogId) {
      throw ApiError.unprocessable(
        'The elective group does not belong to this subject\u2019s semester catalog',
        ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
      );
    }
  }
}

export const subjectService = new SubjectService();
