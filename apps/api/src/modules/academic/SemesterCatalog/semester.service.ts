// apps/api/src/modules/academic/SemesterCatalog/semester.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { semesterCatalogLogger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { curriculumVersionRepository } from '../curricula/curriculum.repository.js';

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
 * This service owns:
 *
 * - SemesterCatalog business rules (CurriculumVersion existence,
 *   `(curriculumVersionId, number)` uniqueness messaging,
 *   `curriculumVersionId` immutability, and — the rule this file exists
 *   to add — protecting a semester's `number` from being silently
 *   reinterpreted once academic records already reference it)
 * - orchestration between semester.repository.ts, semester.mapper.ts,
 *   the CurriculumVersion module's repository (existence check only),
 *   and the Audit module for state-changing operations
 *
 * This service does NOT:
 *
 * - construct Prisma queries (that's semester.repository.ts)
 * - make authorization decisions (that's authorization.service.ts,
 *   called from the controller/route boundary, not from here)
 * - perform HTTP validation (that's semester.validation.ts — structural
 *   bounds on `number` only; "cannot change number once dependents
 *   exist" is a domain-safety rule and belongs here, not there)
 * - implement CurriculumVersion business logic — it only reads a
 *   CurriculumVersion by id to confirm it exists, following
 *   ProgramService.createProgram's identical precedent for reading
 *   Department directly rather than through DepartmentService
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────
 * SemesterCatalog.number identifies a semester's position inside a
 * CurriculumVersion (`@@unique([curriculumVersionId, number])`).
 * Historical academic records — `SemesterEnrollment`, `PromotionBatch`
 * (whose own schema comment calls its FK "the FROM curriculum semester
 * being promoted"), `Timetable`, `Lecture`, `Subject`, `ElectiveGroup`,
 * and `Admission.entrySemesterCatalogId` (a permanent, one-time entry
 * record) — all reference a SemesterCatalog by `id`, not by `number`. A
 * foreign key never changes when `number` changes, but the MEANING of
 * what that id refers to does: a SemesterEnrollment row that meant
 * "this student sat Semester 3" the moment it was created would
 * silently mean "Semester 4" after an administrator edits that row's
 * `number`, with no change to the enrollment record itself. That is the
 * exact integrity failure `updateSemesterCatalog` below exists to
 * prevent — without making `number` immutable outright, since a
 * genuine pre-launch correction (a semester catalog created with the
 * wrong number, with nothing yet enrolled/scheduled/admitted against
 * it) is a legitimate, safe operation.
 *
 * ── AUDIT POLICY ──────────────────────────────────────────────────────
 * CREATE/UPDATE/DELETE use `recordAuditTx` (never `recordAudit`) inside
 * the SAME `prisma.$transaction(...)` as the repository write, matching
 * DepartmentService/ProgramService/CurriculumVersionService exactly. If
 * an update is rejected because dependent records exist, the rejection
 * is thrown BEFORE `semesterCatalogRepository.update()` or
 * `recordAuditTx()` are ever called, so no SemesterCatalog row is
 * touched and no UPDATE audit is written for a mutation that never
 * happened. `AuditEntityType.SEMESTER_CATALOG` did not exist prior to
 * this change — it was added to audit.types.ts as the minimal,
 * explicitly-identified addition required for this service to record
 * audits at all, matching `AuditEntityType.PROGRAM`'s identical
 * precedent (see that file's comment on the added member). Reads
 * (`getSemesterCatalogById`, `listSemesterCatalogs`) are never audited,
 * per the same policy every sibling service follows.
 *
 * ── WHY UPDATE/DELETE RE-READ INSIDE THE TRANSACTION ─────────────────
 * Same reasoning as DepartmentService/ProgramService/
 * CurriculumVersionService: reading the pre-mutation record OUTSIDE
 * `prisma.$transaction` first would leave a window where a concurrent
 * transaction could change the row (or add a dependent record) between
 * the outside read and the in-transaction write. `updateSemesterCatalog`
 * /`deleteSemesterCatalog` below call `semesterCatalogRepository
 * .findByIdTx(tx, id)` from inside the transaction, so the existence
 * check, the `oldValue` snapshot, the dependent-record check, and the
 * mutation all observe the same transactionally-consistent row.
 *
 * ── KNOWN CONCURRENCY LIMITATION (honest, not solved here) ───────────
 * `findByIdTx` + `hasDependentRecords` + `update` all run inside one
 * `prisma.$transaction(...)`, which closes the race between the
 * *outside* world and the transaction as a whole. It does NOT add
 * row-level locking (no `SELECT ... FOR UPDATE`) or a Serializable
 * isolation level, and no other service in this codebase uses either
 * mechanism, so neither is introduced here as a new, unestablished
 * convention. Under Postgres's default READ COMMITTED isolation (what
 * `prisma.$transaction` uses here, matching every sibling service), a
 * narrow window remains: if a second transaction inserts a dependent
 * record (e.g. enrolls a student into this SemesterCatalog) and commits
 * AFTER this transaction's `hasDependentRecords` check but BEFORE this
 * transaction's `update()` commits, `hasDependentRecords` would still
 * have reported zero dependents, and the number change would be
 * allowed despite a dependent record now existing. Closing this fully
 * would require either `SELECT ... FOR UPDATE` (raw SQL — this
 * codebase's repositories currently use only Prisma's typed query API)
 * or running this transaction at Serializable isolation (Prisma
 * supports this via an `isolationLevel` option, but doing so would also
 * require handling Prisma's P2034 write-conflict/retry error, which
 * prisma-error.mapper.ts does not currently map). Neither is introduced
 * here, per this task's own instruction to stop and report rather than
 * silently add raw SQL, a schema change, or a version column. This is a
 * real, currently-unclosed gap — reported, not silently patched or
 * silently ignored. In practice, the exposure window is the duration of
 * one `update()` statement inside an already-open transaction: small,
 * but not zero.
 *
 * ── curriculumVersionId IS NEVER WRITABLE THROUGH updateSemesterCatalog ──
 * `UpdateSemesterCatalogInput` (semester.types.ts) has no
 * `curriculumVersionId` field, and `SemesterCatalogRepository.update`
 * has no code path that would write one even if it did. This service
 * adds no mechanism to reassign a SemesterCatalog's CurriculumVersion —
 * see semester.types.ts's own doc comment for why.
 *
 * ── ERROR CODE ────────────────────────────────────────────────────────
 * When `updateSemesterCatalog` rejects a `number` change because
 * dependent records exist, it throws `ApiError.conflict(message,
 * ErrorCode.SEMESTER_NUMBER_PROTECTED)`. None of the existing codes fit:
 * `DUPLICATE_ENTRY` means a value collision, not a protected/locked
 * field, and `FOREIGN_KEY_VIOLATION` means the opposite direction
 * (referencing something that doesn't exist, not something that does
 * and is blocking a change). `SEMESTER_NUMBER_PROTECTED` was added to
 * ErrorCodes.ts as the minimal, dedicated addition this required —
 * same convention as `AuditEntityType.SEMESTER_CATALOG`'s addition
 * noted above. The HTTP status remains 409; the business rule is
 * unchanged.
 *
 * ── LOGGING ────────────────────────────────────────────────────────
 * `lib/logger.ts` now exports `semesterCatalogLogger` (a child logger
 * keyed `component: 'semester-catalog'`), using the codebase's existing
 * `createChildLogger` mechanism — the same one every sibling logger
 * already uses, not a new logging dependency. CREATE/UPDATE/DELETE each
 * emit a single INFO log once their transaction has resolved
 * successfully — never before, never if the transaction throws.
 * `updateSemesterCatalog`'s log additionally carries `previousNumber`
 * and `newNumber` (captured from the actual pre- and post-update
 * persisted rows, never from raw `input`) — operationally useful for
 * exactly the kind of correction this file exists to gate, without
 * duplicating `recordAuditTx`'s `oldValue`/`newValue`, which remains
 * the authoritative business history. No sensitive data (no request
 * bodies, no tokens) is logged anywhere below.
 */
export class SemesterCatalogService {
  /**
   * Creates a SemesterCatalog.
   *
   * CurriculumVersion existence is checked first — a SemesterCatalog
   * cannot be meaningfully created against a CurriculumVersion that
   * doesn't exist, yielding a clean domain-level 404 rather than
   * relying on the database's foreign-key constraint (P2003) to
   * surface as a generic 400. Mirrors
   * CurriculumVersionService.createCurriculumVersion's identical
   * Program-existence check.
   *
   * `existsByCurriculumVersionAndNumber` runs next — a fast-path check
   * only, for a friendlier conflict message, NOT the concurrency
   * guarantee; the database's `@@unique([curriculumVersionId, number])`
   * constraint is what actually prevents a duplicate (P2002 -> 409 via
   * prisma-error.mapper.ts). If that happens, the transaction (create +
   * audit) rolls back together, so no orphaned audit row is ever
   * written for a create that didn't actually happen.
   */
  async createSemesterCatalog(
    actorUserId: string,
    input: CreateSemesterCatalogInput,
  ): Promise<SemesterCatalogDTO> {
    const curriculumVersion = await curriculumVersionRepository.findById(input.curriculumVersionId);
    if (!curriculumVersion) {
      throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const numberTaken = await semesterCatalogRepository.existsByCurriculumVersionAndNumber(
      input.curriculumVersionId,
      input.number,
    );
    if (numberTaken) {
      throw ApiError.conflict(
        'A semester with this number already exists for this curriculum version',
        ErrorCode.DUPLICATE_ENTRY,
      );
    }

    const semesterCatalog = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

  /**
   * Returns a SemesterCatalog by ID. Not audited — routine read. Never
   * queries CurriculumVersion — `SemesterCatalogDTO.curriculumVersionId`
   * is already a plain id, and a plain lookup has no reason to
   * force-load the owning CurriculumVersion.
   */
  async getSemesterCatalogById(id: SemesterCatalogId): Promise<SemesterCatalogDTO> {
    const semesterCatalog = await semesterCatalogRepository.findById(id);
    if (!semesterCatalog) {
      throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toSemesterCatalogDTO(semesterCatalog);
  }

  /**
   * Lists semester catalogs using the filters/options supplied by the
   * caller. Not audited — routine read. Pagination, sorting, and
   * filtering (curriculumVersionId/number) are all performed by
   * `semesterCatalogRepository.findMany` — this method does not
   * implement any of them itself, and never queries CurriculumVersion
   * per result row (no N+1).
   */
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
   * Updates a SemesterCatalog's `number`. This is the method this file
   * exists to make safe — see the class-level "WHY THIS FILE EXISTS"
   * and "KNOWN CONCURRENCY LIMITATION" notes for the full reasoning;
   * this comment covers only the control flow.
   *
   * `curriculumVersionId` cannot be changed through this method —
   * `UpdateSemesterCatalogInput` has no such field (see the class-level
   * note above).
   *
   * If `number` is not part of the request, or is supplied but equal to
   * the currently persisted value, this behaves exactly like
   * DepartmentService.updateDepartment/ProgramService.updateProgram: a
   * plain existence check, update, and audit, with NO dependent-record
   * check performed — per this task's explicit instruction not to run
   * that check when the number isn't actually changing.
   *
   * If `number` IS changing (present in `input` and different from the
   * persisted value):
   *
   *   1. `semesterCatalogRepository.hasDependentRecords(tx, id)` checks
   *      every model with a foreign key into SemesterCatalog (see that
   *      method's own doc comment for the full list). If any exist, the
   *      change is rejected with a 409 before anything is written or
   *      audited — see the class-level "ERROR CODE GAP" note for why no
   *      specific `ErrorCode` is attached yet.
   *   2. Only if no dependents exist does this check
   *      `(curriculumVersionId, number)` uniqueness via
   *      `findByCurriculumVersionAndNumberTx` — a friendlier pre-check;
   *      the database's `@@unique([curriculumVersionId, number])`
   *      constraint remains the final authority (P2002 -> 409 via
   *      prisma-error.mapper.ts if a race slips past this check).
   *   3. Only then is `semesterCatalogRepository.update()` called.
   *
   * No automatic renumbering of any other SemesterCatalog row is ever
   * performed — this method touches exactly the one row identified by
   * `id`, and nothing else.
   *
   * `oldValue`/`newValue` in the audit record, and `previousNumber`/
   * `newNumber` in the operational log, are both taken from actual
   * persisted SemesterCatalog state (the pre-update row read inside the
   * transaction, and the post-update result), never echoed from
   * `input` — matching every sibling service's identical
   * audit-snapshot discipline.
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

        if (input.number !== undefined && input.number !== existing.number) {
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
   * Deletes a SemesterCatalog.
   *
   * Existence check, `oldValue` snapshot, and the delete all happen
   * inside one transaction via `findByIdTx` — same reasoning as
   * `updateSemesterCatalog`. If the SemesterCatalog still has
   * SemesterEnrollment, Subject, ElectiveGroup, PromotionBatch,
   * Timetable, Lecture, or Admission rows referencing it (all required
   * foreign keys with no cascade declared in schema.prisma), Postgres
   * rejects the deletion (P2003, mapped to 400 by
   * prisma-error.mapper.ts) — that error propagates out of the
   * transaction callback, which rolls the whole transaction back: the
   * delete does not happen, no audit row is written, and the
   * SemesterCatalog remains intact. This mirrors
   * DepartmentService/ProgramService/CurriculumVersionService's delete
   * methods exactly, including deliberately NOT pre-checking dependents
   * the way `updateSemesterCatalog` does — a delete either succeeds
   * outright or the database rejects it; there is no partial/corrective
   * case here to protect against the way there is for a `number`
   * correction.
   */
  async deleteSemesterCatalog(actorUserId: string, id: SemesterCatalogId): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await semesterCatalogRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
      }

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
}

export const semesterCatalogService = new SemesterCatalogService();
