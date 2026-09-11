// apps/api/src/modules/subject-offerings/subjectOffering.repository.ts

import type { Prisma, PrismaClient, SubjectOffering } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

import type {
  CreateSubjectOfferingInput,
  ListSubjectOfferingsFilters,
  ListSubjectOfferingsOptions,
} from './subjectOffering.types.js';

/**
 * As with SemesterEnrollmentRepository/AcademicYearRepository, `create`
 * takes an explicit Prisma transaction client rather than closing over the
 * module-level `prisma` singleton, so the service can compose it with other
 * domain writes (e.g. an audit-log entry) inside one `prisma.$transaction(...)`.
 * Read-only methods use the singleton by default; the `*Tx` counterparts
 * exist for workflows that must read a SubjectOffering row inside the SAME
 * transaction that later writes it, to avoid a stale-read race against the
 * transaction's own work.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export interface SubjectOfferingListQueryResult {
  readonly subjectOfferings: SubjectOffering[];
  readonly total: number;
}

/**
 * No generic update or delete operation. SubjectOffering has exactly two
 * own fields beyond id/timestamps — `subjectId` and `academicYearId` — and
 * `subjectOffering.types.ts` deliberately defines no `UpdateSubjectOfferingInput`:
 * both fields are referenced by id from `FacultyAssignment`, `Timetable`,
 * `Lecture`, `Assignment`, and `StudyMaterial` the moment any teaching/
 * scheduling/assessment activity exists, so reassigning either after that
 * would retroactively move already-taught history onto a different Subject
 * or AcademicYear. There is nothing left for a generic update to touch, and
 * this repository does not invent one.
 *
 * `create` accepts the domain `CreateSubjectOfferingInput` directly rather
 * than a separate `CreateSubjectOfferingPersistenceInput` — unlike
 * SemesterEnrollment (which derives `attemptNumber` server-side) or
 * StudentEnrollment (which derives `userId`/`programId`/`curriculumVersionId`
 * from the referenced Admission), SubjectOffering's persistence write needs
 * nothing beyond what the client-facing input already supplies. This
 * mirrors AcademicYearRepository.create, which accepts
 * `CreateAcademicYearInput` directly for the identical reason.
 *
 * `(subjectId, academicYearId)` IS unique
 * (`@@unique([subjectId, academicYearId])`), unlike SemesterEnrollment's
 * bare `(studentEnrollmentId, semesterCatalogId)` pair — so, unlike
 * `SemesterEnrollmentRepository`, the composite lookup below uses
 * `findUnique` with the compound key, not `findFirst`.
 */
export class SubjectOfferingRepository {
  async findById(id: string): Promise<SubjectOffering | null> {
    return prisma.subjectOffering.findUnique({ where: { id } });
  }

  async findByIdTx(tx: Db, id: string): Promise<SubjectOffering | null> {
    return tx.subjectOffering.findUnique({ where: { id } });
  }

  /**
   * Uses the Prisma-generated compound unique key for
   * `@@unique([subjectId, academicYearId])` — the two fields joined in
   * schema-declaration order, Prisma's default compound-key naming when no
   * explicit `@@unique(..., name: "...")` is given (matching
   * `curriculumVersionId_label` / `semesterCatalogId_code` /
   * `curriculumVersionId_number` elsewhere in this schema).
   */
  async findBySubjectIdAndAcademicYearId(
    subjectId: string,
    academicYearId: string,
  ): Promise<SubjectOffering | null> {
    return prisma.subjectOffering.findUnique({
      where: { subjectId_academicYearId: { subjectId, academicYearId } },
    });
  }

  /**
   * Transaction-scoped counterpart, for a create workflow that wants to
   * read a friendly pre-check inside the same transaction that later
   * inserts the row. This lookup alone is NOT what prevents a duplicate
   * offering under concurrency — two transactions can both observe "none
   * exists" before either commits. The database's own
   * `@@unique([subjectId, academicYearId])` constraint is the sole
   * authority; a losing concurrent `create()` call is expected to raise
   * P2002, which this repository does not catch (see `create` below).
   */
  async findBySubjectIdAndAcademicYearIdTx(
    tx: Db,
    subjectId: string,
    academicYearId: string,
  ): Promise<SubjectOffering | null> {
    return tx.subjectOffering.findUnique({
      where: { subjectId_academicYearId: { subjectId, academicYearId } },
    });
  }

  /**
   * Persists exactly `subjectId` and `academicYearId` — see the class
   * header for why no separate persistence-input type is needed. A
   * resulting P2002 (from the composite unique constraint) is not caught
   * here; it is left to propagate to the service/common error boundary,
   * matching every sibling repository's identical choice not to translate
   * Prisma errors at this layer.
   */
  async create(tx: Db, input: CreateSubjectOfferingInput): Promise<SubjectOffering> {
    return tx.subjectOffering.create({
      data: {
        subjectId: input.subjectId,
        academicYearId: input.academicYearId,
      },
    });
  }

  /**
   * Filters match `ListSubjectOfferingsFilters` exactly — no invented
   * fields. `sortBy` is resolved through an explicit two-way mapping,
   * never by indexing into a Prisma orderBy object with a raw string, so
   * an unexpected value can never reach the query. A stable secondary key
   * (`id`) is appended after the caller's chosen primary sort so rows
   * sharing an identical `createdAt`/`updatedAt` timestamp still produce
   * deterministic pagination — matching
   * `SemesterEnrollmentRepository.list`'s identical tiebreaker shape.
   */
  async list(
    filters: ListSubjectOfferingsFilters,
    options: ListSubjectOfferingsOptions,
  ): Promise<SubjectOfferingListQueryResult> {
    const where: Prisma.SubjectOfferingWhereInput = {
      ...(filters.subjectId !== undefined && { subjectId: filters.subjectId }),
      ...(filters.academicYearId !== undefined && { academicYearId: filters.academicYearId }),
    };

    const orderBy: Prisma.SubjectOfferingOrderByWithRelationInput[] =
      options.sortBy === 'createdAt'
        ? [{ createdAt: options.sortOrder }, { id: options.sortOrder }]
        : [{ updatedAt: options.sortOrder }, { id: options.sortOrder }];

    const [subjectOfferings, total] = await Promise.all([
      prisma.subjectOffering.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.subjectOffering.count({ where }),
    ]);

    return { subjectOfferings, total };
  }
}

export const subjectOfferingRepository = new SubjectOfferingRepository();
