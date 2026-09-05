// apps/api/src/modules/semester-enrollments/semesterEnrollment.repository.ts

import type { Prisma, PrismaClient, SemesterEnrollment } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

import type {
  ListSemesterEnrollmentsFilters,
  ListSemesterEnrollmentsOptions,
} from './semesterEnrollment.types.js';

/**
 * As with StudentEnrollmentRepository, mutating/attempt-allocation methods
 * take an explicit Prisma transaction client rather than closing over the
 * module-level `prisma` singleton, so the service can compute the next
 * attempt number and insert the row (together with its audit-log write) in
 * one `prisma.$transaction(...)`. Read-only methods use the singleton by
 * default.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export interface SemesterEnrollmentListQueryResult {
  readonly semesterEnrollments: SemesterEnrollment[];
  readonly total: number;
}

/**
 * Persistence payload for creation — deliberately NOT the domain
 * `CreateSemesterEnrollmentInput` (studentEnrollmentId + semesterCatalogId +
 * academicYearId only). The service calls `getNextAttemptNumberTx` first,
 * inside the same transaction, and supplies the result as `attemptNumber`
 * here; the HTTP-facing create contract never exposes this field. `status`
 * is omitted — schema.prisma's `@default(IN_PROGRESS)` sets it.
 */
export interface CreateSemesterEnrollmentPersistenceInput {
  readonly studentEnrollmentId: string;
  readonly semesterCatalogId: string;
  readonly academicYearId: string;
  readonly attemptNumber: number;
}

/**
 * No update or delete operation — SemesterEnrollment is permanent
 * historical academic data. `studentEnrollmentId`, `semesterCatalogId`,
 * `academicYearId`, and `attemptNumber` are fixed at creation; `status`
 * changes exclusively through the (separate, not-yet-implemented) promotion
 * workflow, never a generic setter here.
 *
 * `(studentEnrollmentId, semesterCatalogId)` is NOT unique — a student can
 * accumulate multiple attempts at the same curriculum semester over time.
 * The only unique constraint is the full triple
 * `(studentEnrollmentId, semesterCatalogId, attemptNumber)`. Methods below
 * never call `findUnique` on the bare pair.
 */
export class SemesterEnrollmentRepository {
  async findById(id: string): Promise<SemesterEnrollment | null> {
    return prisma.semesterEnrollment.findUnique({ where: { id } });
  }

  async findByIdTx(tx: Db, id: string): Promise<SemesterEnrollment | null> {
    return tx.semesterEnrollment.findUnique({ where: { id } });
  }

  /**
   * Returns the LATEST attempt (highest `attemptNumber`) for this
   * `(studentEnrollmentId, semesterCatalogId)` pair, or `null` if the
   * student has never attempted this curriculum semester. The pair is not
   * unique — this is a `findFirst` ordered by `attemptNumber` descending,
   * not a `findUnique`. `createdAt` is deliberately not used as the
   * ordering key: attempt number, not insertion time, is this domain's
   * ordering for attempts (see `getNextAttemptNumberTx`'s identical
   * reasoning).
   */
  async findByStudentEnrollmentIdAndSemesterCatalogId(
    studentEnrollmentId: string,
    semesterCatalogId: string,
  ): Promise<SemesterEnrollment | null> {
    return prisma.semesterEnrollment.findFirst({
      where: { studentEnrollmentId, semesterCatalogId },
      orderBy: { attemptNumber: 'desc' },
    });
  }

  /**
   * Transaction-scoped counterpart, for workflows (e.g. opening a repeat)
   * that must read the latest attempt inside the SAME transaction that
   * later allocates the next attempt number and inserts the new row —
   * avoiding a stale read against the transaction's own work.
   */
  async findByStudentEnrollmentIdAndSemesterCatalogIdTx(
    tx: Db,
    studentEnrollmentId: string,
    semesterCatalogId: string,
  ): Promise<SemesterEnrollment | null> {
    return tx.semesterEnrollment.findFirst({
      where: { studentEnrollmentId, semesterCatalogId },
      orderBy: { attemptNumber: 'desc' },
    });
  }

  /**
   * Computes the next valid `attemptNumber` for this
   * `(studentEnrollmentId, semesterCatalogId)` pair as `MAX(attemptNumber)
   * + 1` (1 if no rows exist yet) — NOT `COUNT(*) + 1`. Attempt numbers are
   * not guaranteed contiguous (a future data repair or import could leave
   * gaps), so counting existing rows could silently reissue an
   * already-used number; only the actual maximum is safe to build on.
   *
   * This alone does not make attempt allocation concurrency-safe — two
   * concurrent transactions can compute the same "next" value. Safety
   * comes from the combination of this call running inside the caller's
   * transaction, immediately followed by `create()` in that same
   * transaction, and the database's own
   * `@@unique([studentEnrollmentId, semesterCatalogId, attemptNumber])`
   * constraint rejecting whichever transaction loses the race. This method
   * does not retry or lock; a resulting P2002 is left to propagate to the
   * caller.
   *
   * Must be called with `tx`, not the plain singleton — allocation is only
   * meaningful as part of the same transaction that performs the
   * subsequent insert.
   */
  async getNextAttemptNumberTx(
    tx: Db,
    studentEnrollmentId: string,
    semesterCatalogId: string,
  ): Promise<number> {
    const result = await tx.semesterEnrollment.aggregate({
      where: { studentEnrollmentId, semesterCatalogId },
      _max: { attemptNumber: true },
    });

    return result._max.attemptNumber === null ? 1 : result._max.attemptNumber + 1;
  }

  /**
   * Persists exactly what the caller supplies, including `attemptNumber` —
   * the caller (service) is expected to have obtained it from
   * `getNextAttemptNumberTx` within the same transaction. `status` is not
   * accepted; the schema's `@default(IN_PROGRESS)` applies. A resulting
   * P2002 (from the composite unique constraint) is not caught here — see
   * `getNextAttemptNumberTx`'s concurrency note.
   */
  async create(
    tx: Db,
    input: CreateSemesterEnrollmentPersistenceInput,
  ): Promise<SemesterEnrollment> {
    return tx.semesterEnrollment.create({
      data: {
        studentEnrollmentId: input.studentEnrollmentId,
        semesterCatalogId: input.semesterCatalogId,
        academicYearId: input.academicYearId,
        attemptNumber: input.attemptNumber,
      },
    });
  }

  /**
   * Filters match `ListSemesterEnrollmentsFilters` exactly — no invented
   * fields. `sortBy` is resolved through an explicit two-way mapping
   * rather than indexing into a Prisma orderBy object with a raw string,
   * so an unexpected value can never reach the query. A stable secondary
   * key (`id`) is appended after the caller's chosen primary sort so two
   * rows sharing a primary sort value (e.g. identical `createdAt`
   * timestamps, or identical `attemptNumber` across different students)
   * still produce deterministic pagination — `id` is used only as this
   * internal tiebreaker and is not itself a selectable `sortBy` value.
   */
  async list(
    filters: ListSemesterEnrollmentsFilters,
    options: ListSemesterEnrollmentsOptions,
  ): Promise<SemesterEnrollmentListQueryResult> {
    const where: Prisma.SemesterEnrollmentWhereInput = {
      ...(filters.studentEnrollmentId !== undefined && {
        studentEnrollmentId: filters.studentEnrollmentId,
      }),
      ...(filters.semesterCatalogId !== undefined && {
        semesterCatalogId: filters.semesterCatalogId,
      }),
      ...(filters.academicYearId !== undefined && { academicYearId: filters.academicYearId }),
      ...(filters.attemptNumber !== undefined && { attemptNumber: filters.attemptNumber }),
      ...(filters.status !== undefined && { status: filters.status }),
    };

    const orderBy: Prisma.SemesterEnrollmentOrderByWithRelationInput[] =
      options.sortBy === 'attemptNumber'
        ? [{ attemptNumber: options.sortOrder }, { id: options.sortOrder }]
        : [{ createdAt: options.sortOrder }, { id: options.sortOrder }];

    const [semesterEnrollments, total] = await Promise.all([
      prisma.semesterEnrollment.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.semesterEnrollment.count({ where }),
    ]);

    return { semesterEnrollments, total };
  }
}

export const semesterEnrollmentRepository = new SemesterEnrollmentRepository();
