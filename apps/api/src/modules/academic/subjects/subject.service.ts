// apps/api/src/modules/academic/subjects/subject.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { subjectLogger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import { semesterCatalogRepository } from '../SemesterCatalog/semester.repository.js';

import { toSubjectDTO, toSubjectDTOList } from './subject.mapper.js';
import { subjectRepository } from './subject.repository.js';
import type {
  CreateSubjectInput,
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
 * Owns: SemesterCatalog existence checks, composite
 * `(semesterCatalogId, code)` uniqueness messaging, `semesterCatalogId`
 * immutability, transaction boundaries, audit coordination, and DTO
 * mapping. Does not own persistence (subject.repository.ts), HTTP
 * validation (subject.validation.ts), or authorization (route
 * middleware).
 *
 * ── ELECTIVEGROUP VALIDATION: NOT IMPLEMENTED ────────────────────────
 * No `academic/electives/` module exists in this repository — no
 * ElectiveGroup repository or service to check existence, activity, or
 * SemesterCatalog/CurriculumVersion context against. A supplied
 * `electiveGroupId` is persisted as given; the only protection today is
 * the database foreign key (P2003 on a nonexistent id, not a friendly
 * domain error). This is an open dependency, not an oversight — do not
 * work around it with a raw Prisma query here.
 *
 * ── isElective / electiveGroupId: NOT ENFORCED ───────────────────────
 * subject.types.ts and subject.validation.ts both explicitly document
 * this pair as independent and unenforced anywhere in the domain
 * contract. No rule is invented here; a Subject may currently persist
 * `isElective: true` with `electiveGroupId: null`, or the reverse.
 *
 * ── AUDIT ──────────────────────────────────────────────────────────
 * CREATE/UPDATE/DELETE use `recordAuditTx` inside the same
 * `prisma.$transaction(...)` as the repository write, matching
 * DepartmentService/SemesterCatalogService. Reads are never audited.
 *
 * ── CONCURRENCY ────────────────────────────────────────────────────
 * `updateSubject`'s composite-uniqueness pre-check now runs inside the
 * same transaction as its `findByIdTx` read and `update` write (via
 * `findBySemesterCatalogAndCodeTx`), so all three observe one
 * transactionally-consistent snapshot. This closes the gap where the
 * pre-check could read from outside the transaction while the write
 * happened inside it — but it does NOT provide row-level locking
 * (`SELECT ... FOR UPDATE`) or Serializable isolation, neither of which
 * any repository in this codebase uses. Under Postgres's default READ
 * COMMITTED isolation, a second transaction inserting a colliding
 * `(semesterCatalogId, code)` row can still commit between this
 * transaction's pre-check and its `update()` call; the database's
 * `@@unique([semesterCatalogId, code])` constraint (P2002, mapped to
 * 409 by prisma-error.mapper.ts) is what actually closes that window,
 * not this pre-check. `Subject` has no `version` column, so a
 * concurrent update to unrelated fields is not detected as a lost
 * update either — this matches every sibling service's identical,
 * documented limitation.
 */
export class SubjectService {
  /**
   * SemesterCatalog existence is checked directly via
   * `semesterCatalogRepository.findById`, not through a service —
   * matching SemesterCatalogService's identical direct check against
   * CurriculumVersion. `existsBySemesterCatalogAndCode` is a fast-path
   * pre-check only; the database's `@@unique([semesterCatalogId, code])`
   * constraint is the final guarantee (P2002 -> 409). ElectiveGroup
   * existence/context is not checked — see class-level note.
   */
  async createSubject(actorUserId: string, input: CreateSubjectInput): Promise<SubjectDTO> {
    const semesterCatalog = await semesterCatalogRepository.findById(input.semesterCatalogId);
    if (!semesterCatalog) {
      throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
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

  /** Not audited — routine read. */
  async getSubjectById(id: SubjectId): Promise<SubjectDTO> {
    const subject = await subjectRepository.findById(id);
    if (!subject) {
      throw ApiError.notFound('Subject not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toSubjectDTO(subject);
  }

  /**
   * Not audited — routine read. Filtering/sorting/pagination all happen
   * in `subjectRepository.findMany`; `SubjectDTO` is flat, so no
   * per-row SemesterCatalog/ElectiveGroup lookups (no N+1).
   */
  async listSubjects(
    filters: ListSubjectsFilters,
    options: ListSubjectsOptions,
  ): Promise<ListSubjectsResult> {
    const result = await subjectRepository.findMany(filters, options);
    return {
      subjects: toSubjectDTOList(result.subjects),
      total: result.total,
    };
  }

  /**
   * Updates `code`, `name`, `electiveGroupId`, `isElective`.
   * `semesterCatalogId` has no write path — `UpdateSubjectInput`
   * excludes it and `subjectRepository.update` has no branch for it.
   *
   * When `code` changes, the composite-uniqueness pre-check runs via
   * `findBySemesterCatalogAndCodeTx` inside this transaction — see the
   * class-level "CONCURRENCY" note for exactly what guarantee this
   * does and does not provide.
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
   * Hard delete — Subject has no `deletedAt`/status field. No
   * dependent-record pre-check is performed; this mirrors
   * DepartmentService/ProgramService (not SemesterCatalogService's
   * `hasDependentRecords`, which exists for its `number`-reinterpretation
   * risk specifically — Subject's fields carry no equivalent risk).
   * `SubjectComponent.subjectId`, `SubjectOffering.subjectId`, and
   * `StudentElectiveSelection.subjectId` are required FKs with no
   * declared cascade, so Postgres rejects deletion when any exist
   * (P2003 -> 400 via prisma-error.mapper.ts), rolling back the delete
   * and the audit together.
   */
  async deleteSubject(actorUserId: string, id: SubjectId): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await subjectRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Subject not found', ErrorCode.RECORD_NOT_FOUND);
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

    subjectLogger.info('Subject deleted', {
      actorUserId,
      subjectId: id,
    });
  }
}

export const subjectService = new SubjectService();
