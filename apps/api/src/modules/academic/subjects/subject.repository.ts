// apps/api/src/modules/academic/subjects/subject.repository.ts

import type { Prisma, PrismaClient, Subject } from '@spark/database/client';

import { prisma } from '../../../lib/prisma.js';
import type { SemesterCatalogId } from '../SemesterCatalog/semester.types.js';

import type {
  CreateSubjectInput,
  ListSubjectsFilters,
  ListSubjectsOptions,
  SubjectId,
  UpdateSubjectInput,
} from './subject.types.js';

/**
 * As with DepartmentRepository/ProgramRepository/SemesterCatalogRepository,
 * mutating methods take an explicit Prisma transaction client rather than
 * closing over the module-level `prisma` singleton — so a future
 * subject.service.ts can wrap a Subject mutation together with its
 * audit-log write in one `prisma.$transaction(...)`. Read-only methods use
 * the singleton — except `findByIdTx` below, which is deliberately
 * transaction-scoped; see its own doc comment.
 *
 * NOTE: subject.service.ts does not exist yet (confirmed empty as of
 * subject.validation.ts's own file-level comment). The method set below is
 * therefore the minimal, schema-justified surface that mirrors the closest
 * established sibling conventions — not a set verified against actual
 * service call sites. See the final engineering report for exactly which
 * sibling-repository methods were deliberately NOT carried over, and why.
 */
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Raw persistence list result — deliberately NOT `ListSubjectsResult` from
 * subject.types.ts, which holds `SubjectDTO[]` for the API boundary. This
 * repository never produces DTOs; mapping `Subject[]` → `SubjectDTO[]` is
 * subject.mapper.ts's job, one layer up.
 */
export interface SubjectListQueryResult {
  readonly subjects: Subject[];
  readonly total: number;
}

/**
 * The only file allowed to call `prisma.subject.*` directly. Persistence
 * access only: no authorization decisions, no DTO mapping, no audit
 * orchestration, no business rules (e.g. whether `isElective` and
 * `electiveGroupId` may disagree, or whether a Subject may be modified
 * once components/offerings/elective-selections reference it — both
 * belong to subject.service.ts, once it exists).
 *
 * Subject has no `deletedAt`/status field in schema.prisma, so — same as
 * DepartmentRepository/ProgramRepository — no soft-delete filtering
 * appears anywhere below. SemesterCatalogRepository is not imported here:
 * `semesterCatalogId` is persisted as a plain column, with SemesterCatalog
 * existence and referential integrity left to the database foreign key,
 * not a cross-repository call — the same boundary
 * SemesterCatalogRepository already keeps with respect to
 * CurriculumVersion.
 */
export class SubjectRepository {
  /**
   * `code` and `name` are written exactly as submitted — no case
   * conversion or trimming happens here; that's validation's job
   * (subject.validation.ts). `electiveGroupId` and `isElective` are both
   * optional on `CreateSubjectInput` (matching the model's nullable FK and
   * `@default(false)` respectively): conditional spreads let the Prisma
   * column default apply when omitted, rather than this method deciding
   * what "not provided" should mean. `semesterCatalogId` is persisted as
   * given — whether that SemesterCatalog actually exists is guaranteed by
   * the database foreign key (P2003 on violation), not verified here.
   * Uniqueness of `(semesterCatalogId, code)` is enforced by the
   * database's `@@unique([semesterCatalogId, code])` constraint, not by
   * this method: a concurrent duplicate `create()` call is rejected by
   * Postgres (P2002), mapped to a 409 by prisma-error.mapper.ts. Any
   * pre-check the service performs via `existsBySemesterCatalogAndCode` is
   * only for a friendlier error message, never the actual concurrency
   * guarantee.
   */
  async create(tx: Db, input: CreateSubjectInput): Promise<Subject> {
    return tx.subject.create({
      data: {
        semesterCatalogId: input.semesterCatalogId,
        code: input.code,
        name: input.name,
        ...(input.electiveGroupId !== undefined && { electiveGroupId: input.electiveGroupId }),
        ...(input.isElective !== undefined && { isElective: input.isElective }),
      },
    });
  }

  /**
   * Uses `findUnique()` — `id` is a genuinely unique column with no
   * additional filter to combine and no soft-delete flag to exclude,
   * matching ProgramRepository.findById / SemesterCatalogRepository
   * .findById's identical reasoning (not DepartmentRepository's
   * `findFirst()`, which those two siblings already deliberately diverge
   * from).
   */
  async findById(id: SubjectId): Promise<Subject | null> {
    return prisma.subject.findUnique({
      where: { id },
    });
  }

  /**
   * Transaction-scoped equivalent of `findById`. Exists so a future
   * subject.service.ts can read a Subject's pre-mutation state and then
   * update/delete it within the SAME `prisma.$transaction(...)` — mirroring
   * DepartmentRepository.findByIdTx / ProgramRepository.findByIdTx /
   * SemesterCatalogRepository.findByIdTx exactly. As with those three
   * siblings' identical methods, this is a plain read inside a
   * transaction, not `SELECT ... FOR UPDATE` — it provides transactional
   * read consistency for an audit `oldValue` snapshot, not row-level
   * locking or optimistic-concurrency protection. Subject has no
   * `version` column, so a concurrent update between this read and the
   * subsequent write in the same transaction is not detected here.
   */
  async findByIdTx(tx: Db, id: SubjectId): Promise<Subject | null> {
    return tx.subject.findUnique({
      where: { id },
    });
  }

  /**
   * `(semesterCatalogId, code)` is the schema's real composite unique
   * constraint (`@@unique([semesterCatalogId, code])`) — `code` alone does
   * NOT identify a Subject (the same code may legitimately repeat across
   * different SemesterCatalogs, per subject.types.ts's file-level
   * comment), so a bare `findByCode(code)` would be architecturally
   * misleading and is deliberately not offered. Uses Prisma's generated
   * compound selector `semesterCatalogId_code`.
   */
  async findBySemesterCatalogAndCode(
    semesterCatalogId: SemesterCatalogId,
    code: string,
  ): Promise<Subject | null> {
    return prisma.subject.findUnique({
      where: {
        semesterCatalogId_code: { semesterCatalogId, code },
      },
    });
  }

  /**
   * Best-effort fast-path check only, for a friendlier create/update-time
   * conflict message — matching ProgramRepository.existsByCode /
   * SemesterCatalogRepository.existsByCurriculumVersionAndNumber's
   * identical reasoning. The database's `@@unique([semesterCatalogId,
   * code])` constraint remains the actual concurrency guarantee; this
   * method does not and cannot prevent a race between two concurrent
   * requests each observing `false`.
   */
  async existsBySemesterCatalogAndCode(
    semesterCatalogId: SemesterCatalogId,
    code: string,
  ): Promise<boolean> {
    const count = await prisma.subject.count({
      where: { semesterCatalogId, code },
    });
    return count > 0;
  }

  /**
   * Only the fields `UpdateSubjectInput` exposes are ever written: code,
   * name, electiveGroupId, isElective. `semesterCatalogId` has no
   * corresponding branch here at all, so there is no code path through
   * which a caller could reassign a Subject's SemesterCatalog even by
   * mistake (see subject.types.ts's UpdateSubjectInput doc comment on the
   * historical-integrity reasoning).
   *
   * `electiveGroupId` uses `!== undefined`, not truthiness — `null` must
   * reach Prisma as an explicit clear-to-core-subject write, and must be
   * distinguished from "key omitted, leave unchanged"
   * (`exactOptionalPropertyTypes` semantics, per subject.types.ts's
   * UpdateSubjectInput doc comment). `isElective` likewise uses
   * `!== undefined`, not truthiness — `false` is a valid, meaningful value
   * that a truthiness check would silently drop.
   *
   * Plain `id` selector: if `id` doesn't match an existing row, Prisma
   * throws P2025 — mapped to a clean 404 by the centralized Prisma error
   * mapper, same behavior as every sibling repository's `update`.
   */
  async update(tx: Db, id: SubjectId, input: UpdateSubjectInput): Promise<Subject> {
    return tx.subject.update({
      where: { id },
      data: {
        ...(input.code !== undefined && { code: input.code }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.electiveGroupId !== undefined && { electiveGroupId: input.electiveGroupId }),
        ...(input.isElective !== undefined && { isElective: input.isElective }),
      },
    });
  }

  /**
   * Hard delete — Subject has no `deletedAt`/status field to soft-delete
   * with, and none is invented here. `SubjectComponent.subjectId`,
   * `SubjectOffering.subjectId`, and `StudentElectiveSelection.subjectId`
   * are all required foreign keys into Subject with no explicit cascade
   * declared in schema.prisma, so Postgres will reject deleting a Subject
   * that any of them still reference (P2003, mapped to 400 by
   * prisma-error.mapper.ts) rather than silently cascading — the same
   * database-is-final-authority pattern DepartmentRepository.delete /
   * ProgramRepository.delete already rely on. This repository does not
   * pre-check for those child rows itself.
   */
  async delete(tx: Db, id: SubjectId): Promise<Subject> {
    return tx.subject.delete({
      where: { id },
    });
  }

  /**
   * Same count+findMany-in-parallel shape as every sibling repository's
   * `findMany`. `semesterCatalogId`, `electiveGroupId`, and `isElective`
   * are direct equality filters combined as sibling keys on one `where`
   * object (Prisma ANDs them), matching ProgramRepository.findMany's
   * multi-filter combination. `isElective` uses `!== undefined`, not
   * truthiness — `false` is a valid filter value, matching this class's
   * own `update` reasoning above. `electiveGroupId` is a plain equality
   * filter on the value supplied; it does NOT interpret an absent filter
   * or any other value as "unassigned" — `ListSubjectsFilters` defines no
   * such semantic, matching subject.types.ts's own scoping.
   *
   * `search` matches against `code`/`name` via case-insensitive
   * `contains`, matching DepartmentRepository/ProgramRepository's search
   * convention exactly — no new search strategy invented for Subject.
   *
   * `orderBy: { [options.sortBy]: options.sortOrder }` mirrors every
   * sibling repository's identical dynamic-key pattern — safe here for
   * the same reason it's safe there: `options.sortBy` is already
   * whitelisted to the `'code' | 'name' | 'createdAt'` literal union by
   * subject.validation.ts before it ever reaches this method.
   */
  async findMany(
    filters: ListSubjectsFilters,
    options: ListSubjectsOptions,
  ): Promise<SubjectListQueryResult> {
    const where: Prisma.SubjectWhereInput = {
      ...(filters.semesterCatalogId !== undefined && {
        semesterCatalogId: filters.semesterCatalogId,
      }),
      ...(filters.electiveGroupId !== undefined && { electiveGroupId: filters.electiveGroupId }),
      ...(filters.isElective !== undefined && { isElective: filters.isElective }),
      ...(filters.search && {
        OR: [
          { code: { contains: filters.search, mode: 'insensitive' } },
          { name: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.subject.count({ where }),
    ]);

    return { subjects, total };
  }

  /**
   * Transaction-scoped equivalent of `findBySemesterCatalogAndCode`, used
   * by `SubjectService.updateSubject` so its composite-uniqueness
   * pre-check observes the same transactional snapshot as its
   * `findByIdTx` read and its `update` write — mirroring
   * `SemesterCatalogRepository.findByCurriculumVersionAndNumberTx`'s
   * identical relationship to its own `findByIdTx`. Like
   * `findBySemesterCatalogAndCode`, this remains a best-effort pre-check
   * only; the database's `@@unique([semesterCatalogId, code])` constraint
   * is the actual concurrency guarantee.
   */
  async findBySemesterCatalogAndCodeTx(
    tx: Db,
    semesterCatalogId: SemesterCatalogId,
    code: string,
  ): Promise<Subject | null> {
    return tx.subject.findUnique({
      where: {
        semesterCatalogId_code: { semesterCatalogId, code },
      },
    });
  }
}

export const subjectRepository = new SubjectRepository();
