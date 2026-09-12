// apps/api/src/modules/faculty-assignments/facultyAssignment.repository.ts

import type { FacultyAssignment, Prisma, PrismaClient } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

import type {
  CreateFacultyAssignmentInput,
  ListFacultyAssignmentsFilters,
  ListFacultyAssignmentsOptions,
} from './facultyAssignment.types.js';

/**
 * As with SubjectOfferingRepository/SemesterEnrollmentRepository, `create`
 * takes an explicit Prisma transaction client rather than closing over the
 * module-level `prisma` singleton, so the service can compose it with the
 * SubjectOffering/SubjectComponent/faculty-role verification and any
 * audit-log write inside one `prisma.$transaction(...)`. Read-only methods
 * use the singleton by default; the `*Tx` counterparts exist for workflows
 * that must read a FacultyAssignment row inside the SAME transaction that
 * later writes it, to avoid a stale-read race against the transaction's
 * own work.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export interface FacultyAssignmentListQueryResult {
  readonly facultyAssignments: FacultyAssignment[];
  readonly total: number;
}

/**
 * No generic update or delete operation. FacultyAssignment has exactly
 * three own fields beyond id/timestamps — `subjectOfferingId`,
 * `subjectComponentId`, `facultyUserId` — and `facultyAssignment.types.ts`
 * deliberately defines no `UpdateFacultyAssignmentInput`: all three are
 * referenced by id from `Timetable`/`Lecture` the moment any
 * scheduling/teaching activity exists, so reassigning any of them after
 * that would retroactively move already-scheduled/already-taught history
 * onto a different offering/component/faculty. There is nothing left for
 * a generic update to touch, and this repository does not invent one —
 * matching `SubjectOfferingRepository`'s identical reasoning for its own
 * absent update/delete.
 *
 * `create` accepts the domain `CreateFacultyAssignmentInput` directly
 * rather than a separate persistence-input type — like
 * `SubjectOfferingRepository.create`, this write needs nothing beyond
 * what the client-facing input already supplies (no server-derived field
 * such as SemesterEnrollment's `attemptNumber`).
 *
 * `(subjectOfferingId, subjectComponentId)` IS unique
 * (`@@unique([subjectOfferingId, subjectComponentId])`) — like
 * SubjectOffering's `(subjectId, academicYearId)` and unlike
 * SemesterEnrollment's non-unique `(studentEnrollmentId,
 * semesterCatalogId)` pair — so the composite lookup below uses
 * `findUnique` with the compound key, not `findFirst`.
 */
export class FacultyAssignmentRepository {
  async findById(id: string): Promise<FacultyAssignment | null> {
    return prisma.facultyAssignment.findUnique({ where: { id } });
  }

  async findByIdTx(tx: Db, id: string): Promise<FacultyAssignment | null> {
    return tx.facultyAssignment.findUnique({ where: { id } });
  }

  /**
   * Uses the Prisma-generated compound unique key for
   * `@@unique([subjectOfferingId, subjectComponentId])` — the two fields
   * joined in schema-declaration order, Prisma's default compound-key
   * naming when no explicit `@@unique(..., name: "...")` is given
   * (matching `subjectId_academicYearId` on `SubjectOffering`).
   */
  async findBySubjectOfferingIdAndSubjectComponentId(
    subjectOfferingId: string,
    subjectComponentId: string,
  ): Promise<FacultyAssignment | null> {
    return prisma.facultyAssignment.findUnique({
      where: {
        subjectOfferingId_subjectComponentId: { subjectOfferingId, subjectComponentId },
      },
    });
  }

  /**
   * Transaction-scoped counterpart, for a create workflow that wants to
   * read a friendly pre-check inside the same transaction that later
   * inserts the row. This lookup alone is NOT what prevents a duplicate
   * assignment under concurrency — two transactions can both observe
   * "none exists" before either commits. The database's own
   * `@@unique([subjectOfferingId, subjectComponentId])` constraint is the
   * sole authority; a losing concurrent `create()` call is expected to
   * raise P2002, which this repository does not catch (see `create`
   * below).
   */
  async findBySubjectOfferingIdAndSubjectComponentIdTx(
    tx: Db,
    subjectOfferingId: string,
    subjectComponentId: string,
  ): Promise<FacultyAssignment | null> {
    return tx.facultyAssignment.findUnique({
      where: {
        subjectOfferingId_subjectComponentId: { subjectOfferingId, subjectComponentId },
      },
    });
  }

  /**
   * Persists exactly `subjectOfferingId`, `subjectComponentId`, and
   * `facultyUserId` — see the class header for why no separate
   * persistence-input type is needed. A resulting P2002 (from the
   * composite unique constraint) is not caught here; it is left to
   * propagate to the service/common error boundary, matching every
   * sibling repository's identical choice not to translate Prisma errors
   * at this layer.
   */
  async create(tx: Db, input: CreateFacultyAssignmentInput): Promise<FacultyAssignment> {
    return tx.facultyAssignment.create({
      data: {
        subjectOfferingId: input.subjectOfferingId,
        subjectComponentId: input.subjectComponentId,
        facultyUserId: input.facultyUserId,
      },
    });
  }

  /**
   * Filters match `ListFacultyAssignmentsFilters` exactly — no invented
   * fields. `sortBy` is resolved through an explicit two-way mapping,
   * never by indexing into a Prisma orderBy object with a raw string, so
   * an unexpected value can never reach the query. A stable secondary key
   * (`id`) is appended after the caller's chosen primary sort so rows
   * sharing an identical `createdAt`/`updatedAt` timestamp still produce
   * deterministic pagination — matching
   * `SubjectOfferingRepository.list`'s identical tiebreaker shape.
   */
  async list(
    filters: ListFacultyAssignmentsFilters,
    options: ListFacultyAssignmentsOptions,
  ): Promise<FacultyAssignmentListQueryResult> {
    const where: Prisma.FacultyAssignmentWhereInput = {
      ...(filters.subjectOfferingId !== undefined && {
        subjectOfferingId: filters.subjectOfferingId,
      }),
      ...(filters.subjectComponentId !== undefined && {
        subjectComponentId: filters.subjectComponentId,
      }),
      ...(filters.facultyUserId !== undefined && { facultyUserId: filters.facultyUserId }),
    };

    const orderBy: Prisma.FacultyAssignmentOrderByWithRelationInput[] =
      options.sortBy === 'createdAt'
        ? [{ createdAt: options.sortOrder }, { id: options.sortOrder }]
        : [{ updatedAt: options.sortOrder }, { id: options.sortOrder }];

    const [facultyAssignments, total] = await Promise.all([
      prisma.facultyAssignment.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.facultyAssignment.count({ where }),
    ]);

    return { facultyAssignments, total };
  }
}

export const facultyAssignmentRepository = new FacultyAssignmentRepository();
