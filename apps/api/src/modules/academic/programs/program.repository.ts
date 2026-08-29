// apps/api/src/modules/academic/programs/program.repository.ts

import type { Prisma, PrismaClient, Program } from '@spark/database/client';

import { prisma } from '../../../lib/prisma.js';

import type {
  CreateProgramInput,
  ListProgramsFilters,
  ListProgramsOptions,
  ProgramId,
  UpdateProgramInput,
} from './program.types.js';

/**
 * As with DepartmentRepository/RoleRepository/RoleAssignmentRepository,
 * mutating methods take an explicit Prisma transaction client rather than
 * closing over the module-level `prisma` singleton — so
 * program.service.ts can wrap a Program mutation together with its
 * audit-log write in one `prisma.$transaction(...)`. Read-only methods
 * use the singleton — except `findByIdTx` below, which is deliberately
 * transaction-scoped; see its own doc comment.
 */
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Raw persistence list result — deliberately NOT `ListProgramsResult`
 * from program.types.ts, which holds `ProgramDTO[]` for the API
 * boundary. This repository never produces DTOs; mapping `Program[]` →
 * `ProgramDTO[]` is program.mapper.ts's job, one layer up.
 */
export interface ProgramListQueryResult {
  readonly programs: Program[];
  readonly total: number;
}

/**
 * The only file allowed to call `prisma.program.*` directly. Persistence
 * access only: no authorization decisions, no DTO mapping, no audit
 * orchestration, no business rules (e.g. whether durationYears/
 * totalSemesters may be changed once curricula exist — that belongs to
 * program.service.ts).
 *
 * Program has no `deletedAt`/status field in schema.prisma, so — same as
 * DepartmentRepository — no soft-delete filtering appears anywhere
 * below. DepartmentRepository is not imported here: Program.departmentId
 * is persisted as a plain column, with Department existence and
 * referential integrity left to the database foreign key, not a
 * cross-repository call.
 */
export class ProgramRepository {
  /**
   * `code` is written exactly as submitted — no case conversion or
   * trimming happens here; that's validation's job
   * (program.validation.ts). Uniqueness is enforced by the database's
   * `@@unique([code])` constraint, not by this method: a concurrent
   * duplicate `create()` call is rejected by Postgres (P2002), mapped to
   * a 409 by prisma-error.mapper.ts. Any pre-check the service performs
   * via `existsByCode` is only for a friendlier error message, never the
   * actual concurrency guarantee. `departmentId` is persisted as given —
   * whether that Department actually exists is guaranteed by the
   * database foreign key (P2003 on violation), not verified here.
   */
  async create(tx: Db, input: CreateProgramInput): Promise<Program> {
    return tx.program.create({
      data: {
        name: input.name,
        code: input.code,
        departmentId: input.departmentId,
        durationYears: input.durationYears,
        totalSemesters: input.totalSemesters,
      },
    });
  }

  /**
   * Uses `findUnique()`, not `findFirst()`. This deliberately diverges
   * from DepartmentRepository.findById, which uses `findFirst()` for the
   * same kind of plain, single-column, unconditional lookup with no
   * documented reason for avoiding `findUnique()`. RoleAssignmentRepository
   * .findById faces the identical situation (a genuinely unique column,
   * no additional filter to combine) and uses `findUnique()` — that is
   * the technically correct choice for this shape of query, so it is
   * followed here rather than DepartmentRepository's pattern.
   */
  async findById(id: ProgramId): Promise<Program | null> {
    return prisma.program.findUnique({
      where: { id },
    });
  }

  /**
   * Transaction-scoped equivalent of `findById`. Exists specifically so
   * program.service.ts can read a Program's pre-mutation state and then
   * update/delete it within the SAME `prisma.$transaction(...)` —
   * reading outside the transaction first (the pattern RoleRepository/
   * UserRepository's own call sites still use for their audit
   * `oldValue`) leaves a window where a concurrent transaction could
   * change the row between the read and the write, producing an audit
   * record whose `oldValue` no longer matches what was actually
   * overwritten.
   *
   * Mirrors DepartmentRepository.findByIdTx's reasoning exactly. It uses
   * `findUnique()`, not `findFirst()`, to match this repository's own
   * `findById`/`findByCode` convention above (a genuinely unique column,
   * no additional filter to combine) rather than copying Department's
   * `findFirst()` choice, which this repository already deliberately
   * departs from.
   *
   * Added specifically to satisfy program.service.ts's update/delete
   * transaction requirements — no other caller needs this method today.
   */
  async findByIdTx(tx: Db, id: ProgramId): Promise<Program | null> {
    return tx.program.findUnique({
      where: { id },
    });
  }

  /** `code` is unique (`@@unique([code])`) — same `findUnique()` reasoning as findById above. */
  async findByCode(code: string): Promise<Program | null> {
    return prisma.program.findUnique({
      where: { code },
    });
  }

  async existsByCode(code: string): Promise<boolean> {
    const count = await prisma.program.count({
      where: { code },
    });
    return count > 0;
  }

  /**
   * Only the fields `UpdateProgramInput` exposes are ever written: name,
   * code, durationYears, totalSemesters. `departmentId` has no
   * corresponding branch here at all, so there is no code path through
   * which a caller could reassign a Program's Department even by
   * mistake (see program.types.ts's UpdateProgramInput doc comment).
   * Conditional spreads avoid writing `undefined` for omitted fields,
   * consistent with the project's `exactOptionalPropertyTypes`
   * convention and DepartmentRepository/RoleAssignmentRepository's
   * identical pattern. Plain `id` selector: if `id` doesn't match an
   * existing row, Prisma throws P2025 — mapped to a clean 404 by the
   * centralized Prisma error mapper.
   */
  async update(tx: Db, id: ProgramId, input: UpdateProgramInput): Promise<Program> {
    return tx.program.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.code !== undefined && { code: input.code }),
        ...(input.durationYears !== undefined && { durationYears: input.durationYears }),
        ...(input.totalSemesters !== undefined && { totalSemesters: input.totalSemesters }),
      },
    });
  }

  /**
   * Hard delete — Program has no `deletedAt`/status field to soft-delete
   * with, and no such field is invented here (that's a schema decision,
   * out of scope for this repository). `CurriculumVersion.programId`,
   * `StudentEnrollment.programId`, and `Admission.initialProgramId` are
   * all required foreign keys into Program with no explicit cascade
   * behavior declared in schema.prisma, so Postgres will reject deleting
   * a Program that any of those rows still reference (P2003, mapped to
   * 400 by prisma-error.mapper.ts) rather than silently cascading. This
   * repository does not pre-check for those child rows itself — the
   * database is the single source of truth for that integrity guarantee.
   */
  async delete(tx: Db, id: ProgramId): Promise<Program> {
    return tx.program.delete({
      where: { id },
    });
  }

  /**
   * Same count+findMany-in-parallel shape as every sibling repository's
   * `findMany`. `search` matches against name/code via case-insensitive
   * `contains`, matching DepartmentRepository's search convention
   * exactly. `departmentId` is a direct equality filter on Program's own
   * indexed foreign-key column (`@@index([departmentId])`) — the
   * Department table is never queried to serve this filter.
   *
   * Both filters are combined as sibling keys on one `where` object, so
   * Prisma ANDs them together: supplying both `search` and
   * `departmentId` narrows to Programs in that Department whose name or
   * code matches, never an OR across the two — the same
   * multiple-independent-filter combination pattern already used by
   * RoleAssignmentRepository.findMany.
   *
   * `orderBy: { [options.sortBy]: options.sortOrder }` mirrors every
   * sibling repository's identical dynamic-key pattern — safe here for
   * the same reason it's safe there: `options.sortBy` is already
   * whitelisted to the `'name' | 'code' | 'createdAt'` literal union by
   * program.validation.ts before it ever reaches this method.
   */
  async findMany(
    filters: ListProgramsFilters,
    options: ListProgramsOptions,
  ): Promise<ProgramListQueryResult> {
    const where: Prisma.ProgramWhereInput = {
      ...(filters.departmentId !== undefined && { departmentId: filters.departmentId }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { code: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.program.count({ where }),
    ]);

    return { programs, total };
  }
}

export const programRepository = new ProgramRepository();
