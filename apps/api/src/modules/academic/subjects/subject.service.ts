// apps/api/src/modules/academic/subjects/subject.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { subjectLogger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import { electiveGroupRepository } from '../electives/elective.repository.js';
import { semesterCatalogRepository } from '../SemesterCatalog/semester.repository.js';

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
 * Curriculum hardening additions over the prior version:
 *
 * 1. `Subject.electiveGroupId`, when set, must belong to the SAME
 *    SemesterCatalog as the Subject itself — enforced in
 *    `createSubject` (fast-path, outside the write transaction, mirroring
 *    the existing SemesterCatalog-existence check) and in `updateSubject`
 *    (inside the transaction, via `findByIdTx`, since it must observe
 *    the same snapshot as the update it gates).
 * 2. Any Subject mutation (update or delete) is rejected once the
 *    parent SemesterCatalog has genuine academic-history references
 *    (`semesterCatalogRepository.hasHistoricalUsage`) — SemesterEnrollment,
 *    PromotionBatch, Admission, Timetable, or Lecture. Before that
 *    history exists, ordinary correction remains fully possible.
 *
 * Everything else (composite uniqueness, `semesterCatalogId` immutability,
 * isElective/electiveGroupId non-enforcement, audit/transaction shape) is
 * unchanged from the prior implementation.
 */
export class SubjectService {
  /**
   * SemesterCatalog existence check unchanged. New: when `electiveGroupId`
   * is supplied, the referenced ElectiveGroup must exist AND belong to
   * the same SemesterCatalog as this Subject — checked as a fast-path
   * pre-check outside the transaction, mirroring the existing
   * SemesterCatalog-existence check's own positioning. A mismatch is
   * reported with ACADEMIC_HIERARCHY_MISMATCH, the same code
   * promotion.service.ts already uses for an identical class of
   * cross-hierarchy reference error.
   */
  async createSubject(actorUserId: string, input: CreateSubjectInput): Promise<SubjectDTO> {
    const semesterCatalog = await semesterCatalogRepository.findById(input.semesterCatalogId);
    if (!semesterCatalog) {
      throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
    }

    if (input.electiveGroupId !== undefined) {
      await this.assertElectiveGroupBelongsToSemesterCatalog(
        input.electiveGroupId,
        input.semesterCatalogId,
      );
    }

    const codeTaken = await subjectRepository.existsBySemesterCatalogAndCode(
      input.semesterCatalogId,
      input.code,
    );
    if (codeTaken) {
      throw ApiError.conflict(
        'A subject with this code already exists in this semester catalog',
        ErrorCode.DUPLICATE_ENTRY,
      );
    }

    const subject = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
   * Updates `code`, `name`, `electiveGroupId`, `isElective`.
   * `semesterCatalogId` remains structurally unreachable (unchanged).
   *
   * New ordering, all inside one transaction against one
   * transactionally-consistent read (`findByIdTx`):
   *
   *   1. load existing Subject
   *   2. reject outright if the parent SemesterCatalog is historically
   *      used — this blocks the ENTIRE update, not just an
   *      electiveGroupId change, since any structural edit to a
   *      historically-referenced semester's subject is unsafe.
   *   3. compute the EFFECTIVE post-update electiveGroupId:
   *        input.electiveGroupId === undefined -> existing.electiveGroupId (unchanged)
   *        input.electiveGroupId === null      -> null (explicit clear)
   *        input.electiveGroupId === <id>       -> that id (reassignment)
   *      exactOptionalPropertyTypes means `undefined` and `null` are
   *      distinct, real states here — never collapsed into each other.
   *   4. if the effective value is non-null AND differs from the
   *      existing value, verify it belongs to this Subject's own
   *      (immutable) semesterCatalogId.
   *   5. existing code-uniqueness pre-check, then the write, then audit.
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

      const historical = await semesterCatalogRepository.hasHistoricalUsage(
        tx,
        existing.semesterCatalogId,
      );
      if (historical) {
        throw ApiError.conflict(
          'This subject cannot be modified because its semester already has academic history',
          ErrorCode.SEMESTER_CATALOG_HISTORICAL,
        );
      }

      const effectiveElectiveGroupId =
        input.electiveGroupId === undefined ? existing.electiveGroupId : input.electiveGroupId;

      if (
        effectiveElectiveGroupId !== null &&
        effectiveElectiveGroupId !== existing.electiveGroupId
      ) {
        const electiveGroup = await electiveGroupRepository.findByIdTx(
          tx,
          effectiveElectiveGroupId,
        );
        if (!electiveGroup) {
          throw ApiError.notFound('Elective group not found', ErrorCode.RECORD_NOT_FOUND);
        }
        if (electiveGroup.semesterCatalogId !== existing.semesterCatalogId) {
          throw ApiError.unprocessable(
            'The elective group does not belong to this subject\u2019s semester catalog',
            ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
          );
        }
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
   * Hard delete, same FK-Restrict reliance as before. New: rejected
   * outright once the parent SemesterCatalog has academic history,
   * checked inside the same transaction as the delete via
   * `findByIdTx` + `hasHistoricalUsage`.
   */
  async deleteSubject(actorUserId: string, id: SubjectId): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await subjectRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Subject not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const historical = await semesterCatalogRepository.hasHistoricalUsage(
        tx,
        existing.semesterCatalogId,
      );
      if (historical) {
        throw ApiError.conflict(
          'This subject cannot be deleted because its semester already has academic history',
          ErrorCode.SEMESTER_CATALOG_HISTORICAL,
        );
      }

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

  /** Shared by createSubject's outside-transaction fast-path check. */
  private async assertElectiveGroupBelongsToSemesterCatalog(
    electiveGroupId: ElectiveGroupId,
    semesterCatalogId: string,
  ): Promise<void> {
    const electiveGroup = await electiveGroupRepository.findById(electiveGroupId);
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
