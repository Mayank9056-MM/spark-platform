// apps/api/src/modules/academic/curricula/curriculum.repository.ts

import type { CurriculumVersion, Prisma, PrismaClient } from '@spark/database/client';

import { prisma } from '../../../lib/prisma.js';
import type { ProgramId } from '../programs/program.types.js';

import type {
  CreateCurriculumVersionInput,
  CurriculumVersionId,
  ListCurriculumVersionsFilters,
  ListCurriculumVersionsOptions,
  UpdateCurriculumVersionInput,
} from './curriculum.types.js';

/**
 * As with DepartmentRepository/ProgramRepository/RoleRepository, mutating
 * methods take an explicit Prisma transaction client rather than closing
 * over the module-level `prisma` singleton — so curriculum.service.ts can
 * wrap a CurriculumVersion mutation together with its audit-log write in
 * one `prisma.$transaction(...)`. Read-only methods use the singleton —
 * except `findByIdTx` below, which is deliberately transaction-scoped;
 * see its own doc comment.
 */
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Raw persistence list result — deliberately NOT `ListCurriculumVersionsResult`
 * from curriculum.types.ts, which holds `CurriculumVersionDTO[]` for the
 * API boundary. This repository never produces DTOs; mapping
 * `CurriculumVersion[]` → `CurriculumVersionDTO[]` is curriculum.mapper.ts's
 * job, one layer up. Field name (`curriculumVersions`) matches
 * `ListCurriculumVersionsResult`'s own field name for consistency between
 * the persistence and API result shapes.
 */
export interface CurriculumVersionListQueryResult {
  readonly curriculumVersions: CurriculumVersion[];
  readonly total: number;
}

/**
 * The only file allowed to call `prisma.curriculumVersion.*` directly.
 * Persistence access only: no authorization decisions, no DTO mapping,
 * no audit orchestration, no business rules — in particular, no status
 * transition validation (whether DRAFT may become ACTIVE, whether
 * RETIRED may be edited, whether only one ACTIVE version may exist per
 * Program) and no Program existence checking. Those belong to
 * curriculum.service.ts.
 *
 * ProgramRepository/DepartmentRepository are not imported here:
 * `CurriculumVersion.programId` is persisted as a plain column, with
 * Program existence and referential integrity left to the database
 * foreign key, not a cross-repository call — the same boundary
 * ProgramRepository already keeps with respect to Department.
 *
 * CurriculumVersion has no `deletedAt`/status-based-deletion field in
 * schema.prisma, so — same as DepartmentRepository/ProgramRepository —
 * no soft-delete filtering appears anywhere below. `status`
 * (DRAFT/ACTIVE/RETIRED) is a real persisted lifecycle field, but this
 * repository only ever writes the value it's given; it never inspects
 * or reasons about the current value to decide what's allowed next.
 */
export class CurriculumVersionRepository {
  /**
   * `label` is written exactly as submitted — no case conversion or
   * trimming happens here; that's validation's job
   * (curriculum.validation.ts). Uniqueness of `(programId, label)` is
   * enforced by the database's `@@unique([programId, label])`
   * constraint, not by this method: a concurrent duplicate `create()`
   * call is rejected by Postgres (P2002), mapped to a 409 by
   * prisma-error.mapper.ts. Any pre-check the service performs via
   * `existsByProgramAndLabel` is only for a friendlier error message,
   * never the actual concurrency guarantee. `programId` is persisted as
   * given — whether that Program actually exists is guaranteed by the
   * database foreign key (P2003 on violation), not verified here.
   *
   * `status` is included only when supplied — mirroring
   * RoleAssignmentRepository.create's identical treatment of its own
   * optional `validFrom` — so an omitted `status` leaves Prisma's
   * `@default(DRAFT)` to apply, rather than writing `status: undefined`.
   */
  async create(tx: Db, input: CreateCurriculumVersionInput): Promise<CurriculumVersion> {
    return tx.curriculumVersion.create({
      data: {
        programId: input.programId,
        label: input.label,
        ...(input.status !== undefined && { status: input.status }),
      },
    });
  }

  /**
   * Uses `findUnique()`, not `findFirst()` — matching ProgramRepository's
   * reasoning over DepartmentRepository's: `id` is a genuinely unique
   * column with no additional filter to combine and no soft-delete flag
   * to exclude, so `findUnique()` is the technically correct choice
   * here.
   */
  async findById(id: CurriculumVersionId): Promise<CurriculumVersion | null> {
    return prisma.curriculumVersion.findUnique({
      where: { id },
    });
  }

  /**
   * Transaction-scoped equivalent of `findById`. Exists specifically so
   * curriculum.service.ts can read a CurriculumVersion's pre-mutation
   * state and then update/delete it within the SAME
   * `prisma.$transaction(...)` — reading outside the transaction first
   * leaves a window where a concurrent transaction could change the row
   * between the read and the write, producing an audit record whose
   * `oldValue` no longer matches what was actually overwritten. Mirrors
   * DepartmentRepository.findByIdTx / ProgramRepository.findByIdTx
   * exactly; uses `findUnique()` to match this repository's own
   * `findById` above.
   *
   * This is a plain read inside a transaction, not `SELECT ... FOR
   * UPDATE` — it does not provide row-level locking. If two concurrent
   * transactions both read the same pre-mutation state before either
   * commits, this method alone does not prevent that; no such locking
   * mechanism exists elsewhere in this codebase for Department/Program
   * either, so none is introduced here.
   */
  async findByIdTx(tx: Db, id: CurriculumVersionId): Promise<CurriculumVersion | null> {
    return tx.curriculumVersion.findUnique({
      where: { id },
    });
  }

  /**
   * `(programId, label)` is the schema's real composite unique
   * constraint (`@@unique([programId, label])`) — this uses Prisma's
   * generated compound selector for it, the same `findUnique()`-on-a-
   * real-unique-constraint reasoning as `findByCode` in
   * DepartmentRepository/ProgramRepository, extended to a composite key.
   */
  async findByProgramAndLabel(
    programId: ProgramId,
    label: string,
  ): Promise<CurriculumVersion | null> {
    return prisma.curriculumVersion.findUnique({
      where: {
        programId_label: { programId, label },
      },
    });
  }

  /**
   * Best-effort fast-path check only — see the file-level note on
   * `create()`. The database's `@@unique([programId, label])` constraint
   * remains the actual concurrency guarantee; this method exists purely
   * so the service can return a friendlier pre-check error before
   * attempting the write.
   */
  async existsByProgramAndLabel(programId: ProgramId, label: string): Promise<boolean> {
    const count = await prisma.curriculumVersion.count({
      where: { programId, label },
    });
    return count > 0;
  }

  /**
   * Only the fields `UpdateCurriculumVersionInput` exposes are ever
   * written: `label` and `status`. `programId` has no corresponding
   * branch here at all, so there is no code path through which a caller
   * could reassign a CurriculumVersion's Program even by mistake (see
   * curriculum.types.ts's `UpdateCurriculumVersionInput` doc comment —
   * `StudentEnrollment`/`Admission` rows already reference a
   * CurriculumVersion by id, and reassigning its Program afterward would
   * silently change what Program owns that history). Conditional
   * spreads avoid writing `undefined` for omitted fields, consistent
   * with the project's `exactOptionalPropertyTypes` convention and
   * DepartmentRepository/ProgramRepository's identical pattern.
   *
   * `status` is written exactly as given, with no legality check on the
   * transition — that state-machine decision belongs to
   * curriculum.service.ts, not this repository. Plain `id` selector: if
   * `id` doesn't match an existing row, Prisma throws P2025 — mapped to
   * a clean 404 by the centralized Prisma error mapper.
   */
  async update(
    tx: Db,
    id: CurriculumVersionId,
    input: UpdateCurriculumVersionInput,
  ): Promise<CurriculumVersion> {
    return tx.curriculumVersion.update({
      where: { id },
      data: {
        ...(input.label !== undefined && { label: input.label }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });
  }

  /**
   * Hard delete — CurriculumVersion has no `deletedAt`/status-based
   * soft-delete field to use instead, and none is invented here (that's
   * a schema decision, out of scope for this repository).
   * `SemesterCatalog.curriculumVersionId`, `StudentEnrollment.curriculumVersionId`,
   * and `Admission.initialCurriculumId` are all required foreign keys
   * into CurriculumVersion with no explicit cascade behavior declared in
   * schema.prisma, so Postgres will reject deleting a CurriculumVersion
   * that any of those rows still reference (P2003, mapped to 400 by
   * prisma-error.mapper.ts) rather than silently cascading. This
   * repository does not pre-check for those child rows, delete them, or
   * cascade in application code — the database is the single source of
   * truth for that integrity guarantee, matching
   * DepartmentRepository.delete / ProgramRepository.delete exactly.
   */
  async delete(tx: Db, id: CurriculumVersionId): Promise<CurriculumVersion> {
    return tx.curriculumVersion.delete({
      where: { id },
    });
  }

  /**
   * Same count+findMany-in-parallel shape as every sibling repository's
   * `findMany`, using the identical `where` object for both calls so
   * `total` always matches the filtered result set, never the whole
   * table.
   *
   * `search` matches only against `label` via case-insensitive
   * `contains` — CurriculumVersion has no `code`/`name` field to also
   * search, unlike Department/Program's two-field OR. `programId` and
   * `status` are direct equality filters on indexed columns
   * (`@@index([programId, status])`); all three are combined as sibling
   * keys on one `where` object, so Prisma ANDs them together — matching
   * ProgramRepository.findMany's identical multi-filter combination
   * pattern, never an OR across independent filters.
   *
   * `orderBy: { [options.sortBy]: options.sortOrder }` mirrors every
   * sibling repository's identical dynamic-key pattern — safe here for
   * the same reason it's safe there: `options.sortBy` is already
   * whitelisted to the `'label' | 'status' | 'createdAt'` literal union
   * by curriculum.validation.ts before it ever reaches this method.
   */
  async findMany(
    filters: ListCurriculumVersionsFilters,
    options: ListCurriculumVersionsOptions,
  ): Promise<CurriculumVersionListQueryResult> {
    const where: Prisma.CurriculumVersionWhereInput = {
      ...(filters.programId !== undefined && { programId: filters.programId }),
      ...(filters.status !== undefined && { status: filters.status }),
      ...(filters.search && {
        label: { contains: filters.search, mode: 'insensitive' },
      }),
    };

    const [curriculumVersions, total] = await Promise.all([
      prisma.curriculumVersion.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.curriculumVersion.count({ where }),
    ]);

    return { curriculumVersions, total };
  }

  /**
   * Transaction-scoped equivalent of `findByProgramAndLabel`. Added so
   * curriculum.service.ts's updateCurriculumVersion can evaluate
   * `(programId, label)` uniqueness against the SAME transaction it uses
   * to read the pre-mutation row (`findByIdTx`) and perform the update —
   * mirroring `findByIdTx`'s own relationship to `findById` above. Like
   * `findByProgramAndLabel`, this is a best-effort pre-check only; the
   * database's `@@unique([programId, label])` constraint remains the
   * actual concurrency guarantee.
   */
  async findByProgramAndLabelTx(
    tx: Db,
    programId: ProgramId,
    label: string,
  ): Promise<CurriculumVersion | null> {
    return tx.curriculumVersion.findUnique({
      where: {
        programId_label: { programId, label },
      },
    });
  }
}

export const curriculumVersionRepository = new CurriculumVersionRepository();
