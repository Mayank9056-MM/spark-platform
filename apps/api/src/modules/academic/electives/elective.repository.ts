// apps/api/src/modules/academic/electives/elective.repository.ts

import type { ElectiveGroup, Prisma, PrismaClient } from '@spark/database/client';

import { prisma } from '../../../lib/prisma.js';
import type { SemesterCatalogId } from '../SemesterCatalog/semester.types.js';

import type {
  CreateElectiveGroupInput,
  ElectiveGroupId,
  ListElectiveGroupsFilters,
  ListElectiveGroupsOptions,
  UpdateElectiveGroupInput,
} from './elective.types.js';

/**
 * As with SubjectRepository/SemesterCatalogRepository/CurriculumVersionRepository,
 * mutating methods take an explicit Prisma transaction client rather than
 * closing over the module-level `prisma` singleton — so a future
 * elective.service.ts can wrap an ElectiveGroup mutation together with its
 * audit-log write in one `prisma.$transaction(...)`. Read-only methods use
 * the singleton — except `findByIdTx` and `findBySemesterCatalogAndNameTx`
 * below, which are deliberately transaction-scoped; see their own doc
 * comments.
 *
 * NOTE: elective.service.ts is confirmed empty. The method set below is
 * therefore the minimal, schema-justified surface that mirrors the closest
 * established sibling conventions — SubjectRepository (direct
 * SemesterCatalog parent, composite `(semesterCatalogId, X)` unique
 * constraint) and SemesterCatalogRepository/CurriculumVersionRepository
 * (the `findBy...Tx` uniqueness-recheck pattern used inside a service's
 * update transaction) — not a set verified against actual service call
 * sites. See "Issues discovered" in the final report.
 */
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Raw persistence list result — deliberately NOT `ListElectiveGroupsResult`
 * from elective.types.ts, which holds `ElectiveGroupDTO[]` for the API
 * boundary. This repository never produces DTOs (see subject.mapper.ts /
 * elective.mapper.ts's identical division of labor); mapping
 * `ElectiveGroup[]` → `ElectiveGroupDTO[]` is elective.mapper.ts's job, one
 * layer up.
 */
export interface ElectiveGroupListQueryResult {
  readonly electiveGroups: ElectiveGroup[];
  readonly total: number;
}

/**
 * The only file allowed to call `prisma.electiveGroup.*` directly.
 * Persistence access only: no authorization decisions, no DTO mapping, no
 * audit orchestration, no business rules (e.g. whether `minSelect <=
 * maxSelect`, whether a group may be modified once
 * StudentElectiveSelection rows exist against it, or whether the actor is
 * permitted — all belong to elective.service.ts, once it exists).
 *
 * ElectiveGroup has no `deletedAt`/status field in schema.prisma, so — same
 * as SubjectRepository/DepartmentRepository/ProgramRepository/
 * CurriculumVersionRepository — no soft-delete filtering appears anywhere
 * below. SemesterCatalogRepository is not imported here: `semesterCatalogId`
 * is persisted as a plain column, with SemesterCatalog existence and
 * referential integrity left to the database foreign key, not a
 * cross-repository call — the same boundary SubjectRepository already keeps
 * with respect to SemesterCatalog.
 */
export class ElectiveGroupRepository {
  /**
   * `name` is written exactly as submitted — no trimming/normalization
   * happens here; that's validation's job (elective.validation.ts).
   * `minSelect`/`maxSelect` are both optional on `CreateElectiveGroupInput`,
   * matching the model's `@default(1)` on each: conditional spreads let the
   * Prisma column default apply when omitted, rather than this method
   * deciding what "not provided" should mean — matching
   * SubjectRepository.create's identical treatment of its own optional
   * `electiveGroupId`/`isElective`. `semesterCatalogId` is persisted as
   * given — whether that SemesterCatalog actually exists is guaranteed by
   * the database foreign key (P2003 on violation), not verified here.
   *
   * Uniqueness of `(semesterCatalogId, name)` is enforced by the database's
   * `@@unique([semesterCatalogId, name])` constraint, not by this method: a
   * concurrent duplicate `create()` call is rejected by Postgres (P2002),
   * mapped to a 409 by prisma-error.mapper.ts. Any pre-check the service
   * performs via `existsBySemesterCatalogAndName` is only for a friendlier
   * error message, never the actual concurrency guarantee.
   */
  async create(tx: Db, input: CreateElectiveGroupInput): Promise<ElectiveGroup> {
    return tx.electiveGroup.create({
      data: {
        semesterCatalogId: input.semesterCatalogId,
        name: input.name,
        ...(input.minSelect !== undefined && { minSelect: input.minSelect }),
        ...(input.maxSelect !== undefined && { maxSelect: input.maxSelect }),
      },
    });
  }

  /**
   * Uses `findUnique()` — `id` is a genuinely unique column with no
   * additional filter to combine and no soft-delete flag to exclude,
   * matching SubjectRepository.findById / SemesterCatalogRepository
   * .findById / CurriculumVersionRepository.findById's identical
   * reasoning.
   */
  async findById(id: ElectiveGroupId): Promise<ElectiveGroup | null> {
    return prisma.electiveGroup.findUnique({
      where: { id },
    });
  }

  /**
   * Transaction-scoped equivalent of `findById`. Exists so a future
   * elective.service.ts can read an ElectiveGroup's pre-mutation state and
   * then update/delete it within the SAME `prisma.$transaction(...)` —
   * mirroring SubjectRepository.findByIdTx / SemesterCatalogRepository
   * .findByIdTx / CurriculumVersionRepository.findByIdTx exactly. As with
   * those siblings' identical methods, this is a plain read inside a
   * transaction, not `SELECT ... FOR UPDATE` — it provides transactional
   * read consistency for an audit `oldValue` snapshot, not row-level
   * locking or optimistic-concurrency protection. ElectiveGroup has no
   * `version` column, so a concurrent update between this read and the
   * subsequent write in the same transaction is not detected here.
   */
  async findByIdTx(tx: Db, id: ElectiveGroupId): Promise<ElectiveGroup | null> {
    return tx.electiveGroup.findUnique({
      where: { id },
    });
  }

  /**
   * `(semesterCatalogId, name)` is the schema's real composite unique
   * constraint (`@@unique([semesterCatalogId, name])`) — `name` alone does
   * NOT identify an ElectiveGroup (the same name may legitimately repeat
   * across different SemesterCatalogs), so a bare `findByName(name)` would
   * be architecturally misleading and is deliberately not offered. Uses
   * Prisma's generated compound selector `semesterCatalogId_name`, matching
   * SubjectRepository.findBySemesterCatalogAndCode's identical use of
   * `semesterCatalogId_code`.
   */
  async findBySemesterCatalogAndName(
    semesterCatalogId: SemesterCatalogId,
    name: string,
  ): Promise<ElectiveGroup | null> {
    return prisma.electiveGroup.findUnique({
      where: {
        semesterCatalogId_name: { semesterCatalogId, name },
      },
    });
  }

  /**
   * Best-effort fast-path check only, for a friendlier create-time conflict
   * message — matching SubjectRepository.existsBySemesterCatalogAndCode /
   * SemesterCatalogRepository.existsByCurriculumVersionAndNumber's identical
   * reasoning. The database's `@@unique([semesterCatalogId, name])`
   * constraint remains the actual concurrency guarantee; this method does
   * not and cannot prevent a race between two concurrent requests each
   * observing `false`.
   */
  async existsBySemesterCatalogAndName(
    semesterCatalogId: SemesterCatalogId,
    name: string,
  ): Promise<boolean> {
    const count = await prisma.electiveGroup.count({
      where: { semesterCatalogId, name },
    });
    return count > 0;
  }

  /**
   * Transaction-scoped equivalent of `findBySemesterCatalogAndName`, for a
   * future elective.service.ts's `updateElectiveGroup` to pre-check
   * `(semesterCatalogId, name)` uniqueness against the SAME transaction it
   * uses to read the pre-mutation row (`findByIdTx`) and perform the update
   * — mirroring SubjectRepository.findBySemesterCatalogAndCodeTx /
   * SemesterCatalogRepository.findByCurriculumVersionAndNumberTx /
   * CurriculumVersionRepository.findByProgramAndLabelTx's identical
   * relationship to their own `findByIdTx`. Like
   * `findBySemesterCatalogAndName`, this remains a best-effort pre-check
   * only; the database's `@@unique([semesterCatalogId, name])` constraint
   * is the actual concurrency guarantee.
   */
  async findBySemesterCatalogAndNameTx(
    tx: Db,
    semesterCatalogId: SemesterCatalogId,
    name: string,
  ): Promise<ElectiveGroup | null> {
    return tx.electiveGroup.findUnique({
      where: {
        semesterCatalogId_name: { semesterCatalogId, name },
      },
    });
  }

  /**
   * Only the fields `UpdateElectiveGroupInput` exposes are ever written:
   * `name`, `minSelect`, `maxSelect`. `semesterCatalogId` has no
   * corresponding branch here at all, so there is no code path through
   * which a caller could reassign an ElectiveGroup's SemesterCatalog even
   * by mistake (see elective.types.ts's `UpdateElectiveGroupInput` doc
   * comment on the historical-integrity reasoning: `Subject.electiveGroupId`
   * and `StudentElectiveSelection.electiveGroupId` both already reference
   * an ElectiveGroup by id once populated).
   *
   * All three fields use `!== undefined`, not truthiness — matching
   * SubjectRepository.update's identical `exactOptionalPropertyTypes`
   * reasoning (an omitted key must leave the column unchanged; a supplied
   * value, even a falsy-looking one, must be written). `minSelect`/
   * `maxSelect` are persisted exactly as given, with no clamping, swapping,
   * or `minSelect <= maxSelect` enforcement — that invariant is
   * unenforced anywhere in the schema and is explicitly a service-layer
   * concern per elective.types.ts's own doc comment.
   *
   * Plain `id` selector: if `id` doesn't match an existing row, Prisma
   * throws P2025 — mapped to a clean 404 by the centralized Prisma error
   * mapper, same behavior as every sibling repository's `update`.
   */
  async update(
    tx: Db,
    id: ElectiveGroupId,
    input: UpdateElectiveGroupInput,
  ): Promise<ElectiveGroup> {
    return tx.electiveGroup.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.minSelect !== undefined && { minSelect: input.minSelect }),
        ...(input.maxSelect !== undefined && { maxSelect: input.maxSelect }),
      },
    });
  }

  /**
   * Hard delete — ElectiveGroup has no `deletedAt`/status field to
   * soft-delete with, and none is invented here (that's a schema decision,
   * out of scope for this repository). `Subject.electiveGroupId` (nullable)
   * and `StudentElectiveSelection.electiveGroupId` (required) are both
   * foreign keys into ElectiveGroup with no explicit cascade behavior
   * declared in schema.prisma, so Postgres will reject deleting an
   * ElectiveGroup that either still references (P2003, mapped to 400 by
   * prisma-error.mapper.ts) rather than silently cascading or leaving
   * orphaned academic history — the same database-is-final-authority
   * pattern SubjectRepository.delete / SemesterCatalogRepository.delete
   * already rely on. This repository does not pre-check for those child
   * rows, delete them, or cascade in application code.
   */
  async delete(tx: Db, id: ElectiveGroupId): Promise<ElectiveGroup> {
    return tx.electiveGroup.delete({
      where: { id },
    });
  }

  /**
   * Same count+findMany-in-parallel shape as every sibling repository's
   * `findMany`, using the identical `where` object for both calls so
   * `total` always matches the filtered result set, never the whole table.
   *
   * `semesterCatalogId` is a direct equality filter on ElectiveGroup's own
   * foreign-key column (also the leftmost column of the composite unique
   * index), matching SubjectRepository.findMany's identical treatment of
   * its own `semesterCatalogId` filter. `search` matches only against
   * `name` via case-insensitive `contains` — ElectiveGroup's only free-text
   * field (no `code`), matching CurriculumVersionRepository.findMany's
   * identical single-field search (that model also has no `code`). Both
   * filters are combined as sibling keys on one `where` object, so Prisma
   * ANDs them together — never an OR across independent filters.
   *
   * `orderBy: { [options.sortBy]: options.sortOrder }` mirrors every
   * sibling repository's identical dynamic-key pattern — safe here for the
   * same reason it's safe there: `options.sortBy` is already whitelisted to
   * the `'name' | 'createdAt'` literal union by elective.validation.ts
   * before it ever reaches this method.
   */
  async findMany(
    filters: ListElectiveGroupsFilters,
    options: ListElectiveGroupsOptions,
  ): Promise<ElectiveGroupListQueryResult> {
    const where: Prisma.ElectiveGroupWhereInput = {
      ...(filters.semesterCatalogId !== undefined && {
        semesterCatalogId: filters.semesterCatalogId,
      }),
      ...(filters.search && {
        name: { contains: filters.search, mode: 'insensitive' },
      }),
    };

    const [electiveGroups, total] = await Promise.all([
      prisma.electiveGroup.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.electiveGroup.count({ where }),
    ]);

    return { electiveGroups, total };
  }
}

export const electiveGroupRepository = new ElectiveGroupRepository();
