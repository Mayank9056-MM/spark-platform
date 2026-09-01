// apps/api/src/modules/academic/SemesterCatalog/semester.repository.ts

import type { Prisma, PrismaClient, SemesterCatalog } from '@spark/database/client';

import { prisma } from '../../../lib/prisma.js';
import type { CurriculumVersionId } from '../curricula/curriculum.types.js';

import type {
  CreateSemesterCatalogInput,
  ListSemesterCatalogsFilters,
  ListSemesterCatalogsOptions,
  SemesterCatalogId,
  UpdateSemesterCatalogInput,
} from './semester.types.js';

/**
 * As with DepartmentRepository/ProgramRepository/CurriculumVersionRepository,
 * mutating methods take an explicit Prisma transaction client rather
 * than closing over the module-level `prisma` singleton — so
 * semester.service.ts can wrap a SemesterCatalog mutation, its
 * dependent-record safety check, and its audit-log write in one
 * `prisma.$transaction(...)`. Read-only methods use the singleton —
 * except `findByIdTx` and `hasDependentRecords` below, which are
 * deliberately transaction-scoped; see their own doc comments.
 */
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Raw persistence list result — deliberately NOT
 * `ListSemesterCatalogsResult` from semester.types.ts, which holds
 * `SemesterCatalogDTO[]` for the API boundary. This repository never
 * produces DTOs; mapping `SemesterCatalog[]` → `SemesterCatalogDTO[]`
 * is semester.mapper.ts's job, one layer up.
 */
export interface SemesterCatalogListQueryResult {
  readonly semesterCatalogs: SemesterCatalog[];
  readonly total: number;
}

/**
 * The only file allowed to call `prisma.semesterCatalog.*` directly —
 * and, for `hasDependentRecords` below, the only file allowed to query
 * the seven sibling models that hold a foreign key into SemesterCatalog
 * for that specific existence-check purpose. Persistence access only:
 * no authorization decisions, no DTO mapping, no audit orchestration.
 * In particular, this repository never decides WHETHER a `number`
 * change is safe — `hasDependentRecords` only reports whether dependent
 * rows exist; semester.service.ts decides what to do with that fact.
 *
 * CurriculumVersionRepository is not imported here: SemesterCatalog's
 * `curriculumVersionId` is persisted as a plain column, with
 * CurriculumVersion existence and referential integrity left to the
 * database foreign key, not a cross-repository call — the same boundary
 * CurriculumVersionRepository already keeps with respect to Program.
 *
 * SemesterCatalog has no `deletedAt`/status field in schema.prisma, so —
 * same as DepartmentRepository/ProgramRepository/CurriculumVersionRepository
 * — no soft-delete filtering appears anywhere below.
 */
export class SemesterCatalogRepository {
  /**
   * `number` is written exactly as submitted. Uniqueness of
   * `(curriculumVersionId, number)` is enforced by the database's
   * `@@unique([curriculumVersionId, number])` constraint, not by this
   * method: a concurrent duplicate `create()` call is rejected by
   * Postgres (P2002), mapped to a 409 by prisma-error.mapper.ts. Any
   * pre-check the service performs via
   * `existsByCurriculumVersionAndNumber` is only for a friendlier error
   * message, never the actual concurrency guarantee. `curriculumVersionId`
   * is persisted as given — whether that CurriculumVersion actually
   * exists is guaranteed by the database foreign key (P2003 on
   * violation), not verified here.
   */
  async create(tx: Db, input: CreateSemesterCatalogInput): Promise<SemesterCatalog> {
    return tx.semesterCatalog.create({
      data: {
        curriculumVersionId: input.curriculumVersionId,
        number: input.number,
      },
    });
  }

  /**
   * Uses `findUnique()` — `id` is a genuinely unique column with no
   * additional filter to combine and no soft-delete flag to exclude,
   * matching CurriculumVersionRepository.findById's identical
   * reasoning.
   */
  async findById(id: SemesterCatalogId): Promise<SemesterCatalog | null> {
    return prisma.semesterCatalog.findUnique({
      where: { id },
    });
  }

  /**
   * Transaction-scoped equivalent of `findById`. Exists specifically so
   * semester.service.ts can read a SemesterCatalog's pre-mutation
   * state, determine whether `number` is actually changing, check for
   * dependent records, and perform the update — all within the SAME
   * `prisma.$transaction(...)` — mirroring
   * CurriculumVersionRepository.findByIdTx / DepartmentRepository
   * .findByIdTx / ProgramRepository.findByIdTx exactly.
   *
   * As with those siblings' identical methods, this is a plain read
   * inside a transaction, not `SELECT ... FOR UPDATE` — it does not
   * provide row-level locking. See semester.service.ts's "KNOWN
   * CONCURRENCY LIMITATION" note for what this does and does not
   * protect against.
   */
  async findByIdTx(tx: Db, id: SemesterCatalogId): Promise<SemesterCatalog | null> {
    return tx.semesterCatalog.findUnique({
      where: { id },
    });
  }

  /**
   * `(curriculumVersionId, number)` is the schema's real composite
   * unique constraint (`@@unique([curriculumVersionId, number])`) — a
   * best-effort fast-path check only, for a friendlier create-time
   * conflict message. The database constraint remains the actual
   * concurrency guarantee (see `create` above), matching
   * CurriculumVersionRepository.existsByProgramAndLabel's identical
   * reasoning.
   */
  async existsByCurriculumVersionAndNumber(
    curriculumVersionId: CurriculumVersionId,
    number: number,
  ): Promise<boolean> {
    const count = await prisma.semesterCatalog.count({
      where: { curriculumVersionId, number },
    });
    return count > 0;
  }

  /**
   * Transaction-scoped equivalent, used by semester.service.ts's
   * `updateSemesterCatalog` to pre-check `(curriculumVersionId,
   * number)` uniqueness against the SAME transaction it uses to read
   * the pre-mutation row (`findByIdTx`) and perform the update —
   * mirroring `CurriculumVersionRepository.findByProgramAndLabelTx`'s
   * identical relationship to its own `findByIdTx`. Like
   * `existsByCurriculumVersionAndNumber`, this is a best-effort
   * pre-check only; the database's `@@unique([curriculumVersionId,
   * number])` constraint remains the actual concurrency guarantee.
   */
  async findByCurriculumVersionAndNumberTx(
    tx: Db,
    curriculumVersionId: CurriculumVersionId,
    number: number,
  ): Promise<SemesterCatalog | null> {
    return tx.semesterCatalog.findUnique({
      where: {
        curriculumVersionId_number: { curriculumVersionId, number },
      },
    });
  }

  /**
   * Reports whether ANY academic record already references this
   * SemesterCatalog — the check semester.service.ts's
   * `updateSemesterCatalog` uses to decide whether a `number` change is
   * safe. This method makes no safety decision itself; it only reports
   * a fact, inside whichever transaction the caller passes in.
   *
   * Every model in schema.prisma with a foreign key into
   * `SemesterCatalog` is checked: `SemesterEnrollment.semesterCatalogId`,
   * `Subject.semesterCatalogId`, `ElectiveGroup.semesterCatalogId`,
   * `PromotionBatch.semesterCatalogId`, `Timetable.semesterCatalogId`,
   * `Lecture.semesterCatalogId`, and `Admission.entrySemesterCatalogId`
   * (the one FK with a different field name — an admission's permanent
   * entry-point record, per that model's own schema comment). This list
   * was derived by searching schema.prisma for every relation targeting
   * `SemesterCatalog`; if a future migration adds another one, this
   * method must be updated alongside it — nothing here derives the list
   * dynamically.
   *
   * `count() > 0` per model, not `findFirst()` on each, and NOT
   * short-circuited on the first non-zero count — all seven run
   * concurrently via `Promise.all`, so there is no ordering-dependent
   * behavior between calls. The performance cost of seven indexed COUNT
   * queries against a per-semester-catalog row count that is never
   * large is not a concern worth the added complexity of an early exit.
   *
   * Runs against the same `tx` the caller is already inside (see
   * semester.service.ts) so this observes the same
   * transactionally-consistent state as the `findByIdTx` read that
   * precedes it — it does not, on its own, prevent a new dependent
   * record from being committed by a DIFFERENT transaction between this
   * check and the subsequent `update()` call in the same
   * `$transaction` block; see semester.service.ts's "KNOWN CONCURRENCY
   * LIMITATION" note for the honest boundary of what this provides.
   */
  async hasDependentRecords(tx: Db, id: SemesterCatalogId): Promise<boolean> {
    const [
      semesterEnrollmentCount,
      subjectCount,
      electiveGroupCount,
      promotionBatchCount,
      timetableCount,
      lectureCount,
      admissionCount,
    ] = await Promise.all([
      tx.semesterEnrollment.count({ where: { semesterCatalogId: id } }),
      tx.subject.count({ where: { semesterCatalogId: id } }),
      tx.electiveGroup.count({ where: { semesterCatalogId: id } }),
      tx.promotionBatch.count({ where: { semesterCatalogId: id } }),
      tx.timetable.count({ where: { semesterCatalogId: id } }),
      tx.lecture.count({ where: { semesterCatalogId: id } }),
      tx.admission.count({ where: { entrySemesterCatalogId: id } }),
    ]);

    return (
      semesterEnrollmentCount > 0 ||
      subjectCount > 0 ||
      electiveGroupCount > 0 ||
      promotionBatchCount > 0 ||
      timetableCount > 0 ||
      lectureCount > 0 ||
      admissionCount > 0
    );
  }

  /**
   * Only the field `UpdateSemesterCatalogInput` exposes is ever
   * written: `number`. `curriculumVersionId` has no corresponding
   * branch here at all, so there is no code path through which a caller
   * could reassign a SemesterCatalog's CurriculumVersion even by
   * mistake (see semester.types.ts's `UpdateSemesterCatalogInput` doc
   * comment). Whether THIS PARTICULAR `number` change is safe (no
   * dependent records, no uniqueness conflict) is decided by
   * semester.service.ts BEFORE this method is ever called — this method
   * performs the write unconditionally once called; it does not
   * re-check dependents or uniqueness itself. Plain `id` selector: if
   * `id` doesn't match an existing row, Prisma throws P2025 — mapped to
   * a clean 404 by the centralized Prisma error mapper.
   */
  async update(
    tx: Db,
    id: SemesterCatalogId,
    input: UpdateSemesterCatalogInput,
  ): Promise<SemesterCatalog> {
    return tx.semesterCatalog.update({
      where: { id },
      data: {
        ...(input.number !== undefined && { number: input.number }),
      },
    });
  }

  /**
   * Hard delete — SemesterCatalog has no `deletedAt`/status field to
   * soft-delete with, and none is invented here. Every model checked by
   * `hasDependentRecords` above is also a required foreign key into
   * SemesterCatalog with no explicit cascade declared in schema.prisma,
   * so Postgres will reject deleting a SemesterCatalog that any of them
   * still reference (P2003, mapped to 400 by prisma-error.mapper.ts)
   * rather than silently cascading — the same
   * database-is-final-authority pattern DepartmentRepository.delete /
   * ProgramRepository.delete / CurriculumVersionRepository.delete
   * already rely on.
   */
  async delete(tx: Db, id: SemesterCatalogId): Promise<SemesterCatalog> {
    return tx.semesterCatalog.delete({
      where: { id },
    });
  }

  /**
   * Same count+findMany-in-parallel shape as every sibling repository's
   * `findMany`. `curriculumVersionId` and `number` are direct equality
   * filters combined as sibling keys on one `where` object (Prisma ANDs
   * them), matching CurriculumVersionRepository.findMany's identical
   * multi-filter combination. No `search` branch — SemesterCatalog has
   * no string field, matching semester.types.ts's
   * ListSemesterCatalogsFilters reasoning.
   *
   * `orderBy: { [options.sortBy]: options.sortOrder }` mirrors every
   * sibling repository's identical dynamic-key pattern — safe here for
   * the same reason it's safe there: `options.sortBy` is already
   * whitelisted to the `'number' | 'createdAt'` literal union by
   * semester.validation.ts before it ever reaches this method.
   */
  async findMany(
    filters: ListSemesterCatalogsFilters,
    options: ListSemesterCatalogsOptions,
  ): Promise<SemesterCatalogListQueryResult> {
    const where: Prisma.SemesterCatalogWhereInput = {
      ...(filters.curriculumVersionId !== undefined && {
        curriculumVersionId: filters.curriculumVersionId,
      }),
      ...(filters.number !== undefined && { number: filters.number }),
    };

    const [semesterCatalogs, total] = await Promise.all([
      prisma.semesterCatalog.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.semesterCatalog.count({ where }),
    ]);

    return { semesterCatalogs, total };
  }
}

export const semesterCatalogRepository = new SemesterCatalogRepository();
