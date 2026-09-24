// apps/api/src/modules/academic/SemesterCatalog/semester.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { semesterCatalogLogger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { assertCurriculumStructureMutableTx } from '../curricula/curriculum.guard.js';
import { programRepository } from '../programs/program.repository.js';

import { toSemesterCatalogDTO, toSemesterCatalogDTOList } from './semester.mapper.js';
import { semesterCatalogRepository } from './semester.repository.js';
import type {
  CreateSemesterCatalogInput,
  ListSemesterCatalogsFilters,
  ListSemesterCatalogsOptions,
  ListSemesterCatalogsResult,
  SemesterCatalogDTO,
  SemesterCatalogId,
  UpdateSemesterCatalogInput,
} from './semester.types.js';

import { AuditEntityType } from '@/modules/audit/audit.types.js';

/**
 * Business-logic layer for the SemesterCatalog domain.
 *
 * Owns: structure-freeze enforcement, the `1 <= number <= program
 * .totalSemesters` bound, `(curriculumVersionId, number)` uniqueness
 * messaging, `curriculumVersionId` immutability, and protection of a
 * semester's `number` once academic records reference it.
 *
 * ── STRUCTURE FREEZE ─────────────────────────────────────────────────
 * Every mutation (create, update, delete) first calls
 * `assertCurriculumStructureMutableTx`, so semesters can only change while
 * the owning CurriculumVersion is DRAFT. That guard runs inside the same
 * transaction as the write and locks the version row (see
 * curriculum.guard.ts), which also serializes these writes against
 * activation.
 *
 * ── SEMESTER NUMBER BOUND ────────────────────────────────────────────
 * `number` must satisfy 1 <= number <= program.totalSemesters, checked
 * server-side on create and on any `number` change, using the Program the
 * curriculum version belongs to. Failure: 422 SEMESTER_NUMBER_OUT_OF_RANGE.
 *
 * ── NUMBER PROTECTION (unchanged) ────────────────────────────────────
 * Historical rows reference a SemesterCatalog by id, but the MEANING of
 * that id depends on `number`. Changing `number` is rejected once ANY
 * dependent record exists (`hasDependentRecords`).
 *
 * KNOWN CONCURRENCY LIMITATION (unchanged, honest): the dependents check
 * is a plain read under READ COMMITTED, not a row lock on the semester.
 * The version-level DRAFT lock closes the structure-edit races (subjects
 * and electives are also written under it), but a dependent row created by
 * a different module (e.g. a SemesterEnrollment) between the check and the
 * commit is not blocked. The window is one statement wide; not solved here.
 *
 * ── AUDIT / LOGGING ──────────────────────────────────────────────────
 * CREATE/UPDATE/DELETE use recordAuditTx in the SAME transaction as the
 * write; a rejected mutation writes no audit row. Reads are never audited.
 * One INFO log follows each successful transaction; no request bodies or
 * secrets are logged.
 */
export class SemesterCatalogService {
  /**
   * Creates a SemesterCatalog. All authoritative checks (version exists and
   * is DRAFT, number within the program's range, number not taken) run
   * inside the transaction. `@@unique([curriculumVersionId, number])`
   * remains the final duplicate guarantee (P2002 -> 409).
   */
  async createSemesterCatalog(
    actorUserId: string,
    input: CreateSemesterCatalogInput,
  ): Promise<SemesterCatalogDTO> {
    const semesterCatalog = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const curriculumVersion = await assertCurriculumStructureMutableTx(
        tx,
        input.curriculumVersionId,
      );

      await this.assertNumberWithinProgramRangeTx(tx, curriculumVersion.programId, input.number);

      const numberTaken = await semesterCatalogRepository.findByCurriculumVersionAndNumberTx(
        tx,
        input.curriculumVersionId,
        input.number,
      );
      if (numberTaken) {
        throw ApiError.conflict(
          'A semester with this number already exists for this curriculum version',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      const created = await semesterCatalogRepository.create(tx, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.SEMESTER_CATALOG,
        entityId: created.id,
        newValue: {
          id: created.id,
          curriculumVersionId: created.curriculumVersionId,
          number: created.number,
        },
      });

      return created;
    });

    semesterCatalogLogger.info('Semester catalog created', {
      actorUserId,
      semesterCatalogId: semesterCatalog.id,
      curriculumVersionId: semesterCatalog.curriculumVersionId,
    });

    return toSemesterCatalogDTO(semesterCatalog);
  }

  /** Not audited — routine read. */
  async getSemesterCatalogById(id: SemesterCatalogId): Promise<SemesterCatalogDTO> {
    const semesterCatalog = await semesterCatalogRepository.findById(id);
    if (!semesterCatalog) {
      throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toSemesterCatalogDTO(semesterCatalog);
  }

  /** Not audited — routine read. Filtering/pagination happen in the repository (no N+1). */
  async listSemesterCatalogs(
    filters: ListSemesterCatalogsFilters,
    options: ListSemesterCatalogsOptions,
  ): Promise<ListSemesterCatalogsResult> {
    const result = await semesterCatalogRepository.findMany(filters, options);
    return {
      semesterCatalogs: toSemesterCatalogDTOList(result.semesterCatalogs),
      total: result.total,
    };
  }

  /**
   * Updates a SemesterCatalog's `number`. Control flow:
   *   1. load row (404)
   *   2. structure-freeze guard on its curriculum version (409)
   *   3. if `number` actually changes: range check (422), dependent-record
   *      protection (409), uniqueness pre-check (409)
   *   4. write + audit
   * `curriculumVersionId` is never writable here.
   */
  async updateSemesterCatalog(
    actorUserId: string,
    id: SemesterCatalogId,
    input: UpdateSemesterCatalogInput,
  ): Promise<SemesterCatalogDTO> {
    const { result, previousNumber } = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const existing = await semesterCatalogRepository.findByIdTx(tx, id);
        if (!existing) {
          throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
        }

        const curriculumVersion = await assertCurriculumStructureMutableTx(
          tx,
          existing.curriculumVersionId,
        );

        if (input.number !== undefined && input.number !== existing.number) {
          await this.assertNumberWithinProgramRangeTx(
            tx,
            curriculumVersion.programId,
            input.number,
          );

          const hasDependents = await semesterCatalogRepository.hasDependentRecords(tx, id);
          if (hasDependents) {
            throw ApiError.conflict(
              'The semester number cannot be changed because academic records already reference this semester.',
              ErrorCode.SEMESTER_NUMBER_PROTECTED,
            );
          }

          const conflicting = await semesterCatalogRepository.findByCurriculumVersionAndNumberTx(
            tx,
            existing.curriculumVersionId,
            input.number,
          );
          if (conflicting && conflicting.id !== id) {
            throw ApiError.conflict(
              'A semester with this number already exists for this curriculum version',
              ErrorCode.DUPLICATE_ENTRY,
            );
          }
        }

        const updated = await semesterCatalogRepository.update(tx, id, input);

        await recordAuditTx(tx, {
          actorUserId,
          action: 'UPDATE',
          entityType: AuditEntityType.SEMESTER_CATALOG,
          entityId: existing.id,
          oldValue: {
            curriculumVersionId: existing.curriculumVersionId,
            number: existing.number,
          },
          newValue: {
            curriculumVersionId: updated.curriculumVersionId,
            number: updated.number,
          },
        });

        return { result: updated, previousNumber: existing.number };
      },
    );

    semesterCatalogLogger.info('Semester catalog updated', {
      actorUserId,
      semesterCatalogId: result.id,
      curriculumVersionId: result.curriculumVersionId,
      previousNumber,
      newNumber: result.number,
    });

    return toSemesterCatalogDTO(result);
  }

  /**
   * Deletes a SemesterCatalog, only while its curriculum version is DRAFT.
   * Rows that still reference it (subjects, electives, ...) make Postgres
   * reject the delete (P2003, Restrict) and roll the transaction back —
   * nothing cascades.
   */
  async deleteSemesterCatalog(actorUserId: string, id: SemesterCatalogId): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await semesterCatalogRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
      }

      await assertCurriculumStructureMutableTx(tx, existing.curriculumVersionId);

      await semesterCatalogRepository.delete(tx, id);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'DELETE',
        entityType: AuditEntityType.SEMESTER_CATALOG,
        entityId: existing.id,
        oldValue: {
          id: existing.id,
          curriculumVersionId: existing.curriculumVersionId,
          number: existing.number,
        },
        newValue: null,
      });
    });

    semesterCatalogLogger.info('Semester catalog deleted', {
      actorUserId,
      semesterCatalogId: id,
    });
  }

  /** 1 <= number <= program.totalSemesters. The Program is read inside the caller's transaction. */
  private async assertNumberWithinProgramRangeTx(
    tx: Prisma.TransactionClient,
    programId: string,
    number: number,
  ): Promise<void> {
    const program = await programRepository.findByIdTx(tx, programId);
    if (!program) {
      throw ApiError.notFound('Program not found', ErrorCode.RECORD_NOT_FOUND);
    }
    if (number < 1 || number > program.totalSemesters) {
      throw ApiError.unprocessable(
        `Semester number must be between 1 and ${program.totalSemesters} for this program`,
        ErrorCode.SEMESTER_NUMBER_OUT_OF_RANGE,
      );
    }
  }
}

export const semesterCatalogService = new SemesterCatalogService();
