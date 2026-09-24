// apps/api/src/modules/academic/curricula/curriculum.repository.ts

import type { CurriculumVersion, Prisma, PrismaClient } from '@spark/database/client';

import { prisma } from '../../../lib/prisma.js';
import type { ProgramId } from '../programs/program.types.js';

import type {
  CreateCurriculumVersionInput,
  CurriculumStatus,
  CurriculumVersionId,
  ListCurriculumVersionsFilters,
  ListCurriculumVersionsOptions,
  UpdateCurriculumVersionInput,
} from './curriculum.types.js';

/**
 * Mutating methods take an explicit Prisma transaction client so
 * curriculum.service.ts can wrap a mutation together with its audit write
 * in one `prisma.$transaction(...)`. Read-only methods use the singleton
 * unless a `*Tx` variant exists for a read that must observe the
 * transaction's own snapshot.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export interface CurriculumVersionListQueryResult {
  readonly curriculumVersions: CurriculumVersion[];
  readonly total: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Deliberate, bounded selects (no whole-graph includes)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Administrative structure read: CurriculumVersion -> Program ->
 * Department, and Semesters -> {Subjects, ElectiveGroups}. Prisma resolves
 * each relation level with one batched query (not one per row), so the
 * total is a small constant number of queries regardless of how many
 * semesters/subjects exist. SubjectComponent / offerings / enrollments are
 * intentionally not selected.
 */
const curriculumStructureSelect = {
  id: true,
  label: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  program: {
    select: {
      id: true,
      name: true,
      code: true,
      durationYears: true,
      totalSemesters: true,
      department: { select: { id: true, name: true, code: true } },
    },
  },
  semesterCatalogs: {
    orderBy: { number: 'asc' },
    select: {
      id: true,
      number: true,
      subjects: {
        orderBy: { code: 'asc' },
        select: { id: true, code: true, name: true, isElective: true, electiveGroupId: true },
      },
      electiveGroups: {
        orderBy: { name: 'asc' },
        select: { id: true, name: true, minSelect: true, maxSelect: true },
      },
    },
  },
} satisfies Prisma.CurriculumVersionSelect;

export type CurriculumStructureRecord = Prisma.CurriculumVersionGetPayload<{
  select: typeof curriculumStructureSelect;
}>;

/**
 * Only what activation-readiness evaluation needs (see
 * curriculum.readiness.ts). `subject.electiveGroup.semesterCatalogId` lets
 * the evaluator detect a subject pointing at an elective group that
 * belongs to a different semester.
 */
const activationSnapshotSelect = {
  id: true,
  status: true,
  program: { select: { id: true, totalSemesters: true } },
  semesterCatalogs: {
    orderBy: { number: 'asc' },
    select: {
      id: true,
      number: true,
      subjects: {
        select: {
          id: true,
          code: true,
          electiveGroupId: true,
          electiveGroup: { select: { semesterCatalogId: true } },
        },
      },
      electiveGroups: { select: { id: true, name: true, minSelect: true, maxSelect: true } },
    },
  },
} satisfies Prisma.CurriculumVersionSelect;

export type CurriculumActivationSnapshot = Prisma.CurriculumVersionGetPayload<{
  select: typeof activationSnapshotSelect;
}>;

/**
 * The only file allowed to call `prisma.curriculumVersion.*` directly.
 * Persistence only: no authorization, no DTO mapping, no audit, and no
 * business rules. In particular it never decides whether a transition is
 * legal — it only offers atomic, status-conditional write primitives
 * (`transitionStatus`, `lockDraftTx`, `deleteIfDraft`) that the service
 * composes.
 */
export class CurriculumVersionRepository {
  /**
   * `status` is never written here — Prisma's `@default(DRAFT)` always
   * applies. `(programId, label)` uniqueness is guaranteed by the database
   * (P2002 -> 409); `existsByProgramAndLabel` is only a friendlier pre-check.
   */
  async create(tx: Db, input: CreateCurriculumVersionInput): Promise<CurriculumVersion> {
    return tx.curriculumVersion.create({
      data: {
        programId: input.programId,
        label: input.label,
      },
    });
  }

  async findById(id: CurriculumVersionId): Promise<CurriculumVersion | null> {
    return prisma.curriculumVersion.findUnique({ where: { id } });
  }

  /**
   * Transaction-scoped read, so the service's existence/status checks, the
   * audit `oldValue`, and the write all observe one snapshot. A plain read
   * — it does not lock the row (see `lockDraftTx` for that).
   */
  async findByIdTx(tx: Db, id: CurriculumVersionId): Promise<CurriculumVersion | null> {
    return tx.curriculumVersion.findUnique({ where: { id } });
  }

  async findByProgramAndLabel(
    programId: ProgramId,
    label: string,
  ): Promise<CurriculumVersion | null> {
    return prisma.curriculumVersion.findUnique({
      where: { programId_label: { programId, label } },
    });
  }

  async findByProgramAndLabelTx(
    tx: Db,
    programId: ProgramId,
    label: string,
  ): Promise<CurriculumVersion | null> {
    return tx.curriculumVersion.findUnique({
      where: { programId_label: { programId, label } },
    });
  }

  async existsByProgramAndLabel(programId: ProgramId, label: string): Promise<boolean> {
    const count = await prisma.curriculumVersion.count({ where: { programId, label } });
    return count > 0;
  }

  /**
   * Writes `label` only. `programId` has no branch here, so a version can
   * never be reassigned to another Program. Callers must have already
   * established the version is DRAFT (service + `lockDraftTx`).
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
      },
    });
  }

  /**
   * Atomic, status-conditional transition — same shape as
   * AdmissionRepository.cancel / StudentEnrollmentRepository.cancel.
   * `updateMany` is used because `update`'s `where` cannot express "and
   * status is still `from`". Under READ COMMITTED a losing concurrent
   * caller blocks on the winner's row lock, re-evaluates the WHERE against
   * the committed row, matches zero rows, and gets `null` — so exactly one
   * of two racing transitions succeeds.
   *
   * Legality of `from -> to` is the service's decision, not this method's.
   */
  async transitionStatus(
    tx: Db,
    id: CurriculumVersionId,
    from: CurriculumStatus,
    to: CurriculumStatus,
  ): Promise<CurriculumVersion | null> {
    const { count } = await tx.curriculumVersion.updateMany({
      where: { id, status: from },
      data: { status: to },
    });
    if (count === 0) {
      return null;
    }
    return tx.curriculumVersion.findUniqueOrThrow({ where: { id } });
  }

  /**
   * Takes a row lock on the version IFF it is still DRAFT, held until the
   * surrounding transaction ends. Returns whether the version was DRAFT.
   *
   * Purpose: structure mutations (semester/subject/elective writes) call
   * this, and activation flips the status with the same kind of conditional
   * UPDATE, so the two serialize on this row. Without it, a subject could
   * be deleted by a transaction that saw DRAFT and commit AFTER activation's
   * readiness check, leaving an ACTIVE version that no longer satisfies
   * readiness. The write bumps `updatedAt`, which is accurate: the
   * version's structure is about to change.
   */
  async lockDraftTx(tx: Db, id: CurriculumVersionId): Promise<boolean> {
    const { count } = await tx.curriculumVersion.updateMany({
      where: { id, status: 'DRAFT' },
      data: { updatedAt: new Date() },
    });
    return count > 0;
  }

  /**
   * Conditional hard delete: removes the row only while it is still DRAFT.
   * Returns false if nothing was deleted (missing, or no longer DRAFT).
   * FK violations from still-referencing rows surface as P2003, which the
   * service translates into a domain conflict.
   */
  async deleteIfDraft(tx: Db, id: CurriculumVersionId): Promise<boolean> {
    const { count } = await tx.curriculumVersion.deleteMany({
      where: { id, status: 'DRAFT' },
    });
    return count > 0;
  }

  /**
   * Reports whether anything still references this version: its semesters,
   * admissions, or student enrollments. A fact only — the service decides.
   */
  async hasDependentRecords(tx: Db, id: CurriculumVersionId): Promise<boolean> {
    const [semesterCount, admissionCount, enrollmentCount] = await Promise.all([
      tx.semesterCatalog.count({ where: { curriculumVersionId: id } }),
      tx.admission.count({ where: { initialCurriculumId: id } }),
      tx.studentEnrollment.count({ where: { curriculumVersionId: id } }),
    ]);
    return semesterCount > 0 || admissionCount > 0 || enrollmentCount > 0;
  }

  /**
   * Same count+findMany-in-parallel shape as every sibling. `search`
   * matches `label`; filters are ANDed. `sortBy` is whitelisted by
   * curriculum.validation.ts before reaching here.
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

  /** Read-only administrative structure for GET /:id/structure. */
  async findStructureById(id: CurriculumVersionId): Promise<CurriculumStructureRecord | null> {
    return prisma.curriculumVersion.findUnique({
      where: { id },
      select: curriculumStructureSelect,
    });
  }

  /** Read inside the activation transaction, after the status flip took the row lock. */
  async findActivationSnapshotTx(
    tx: Db,
    id: CurriculumVersionId,
  ): Promise<CurriculumActivationSnapshot | null> {
    return tx.curriculumVersion.findUnique({
      where: { id },
      select: activationSnapshotSelect,
    });
  }
}

export const curriculumVersionRepository = new CurriculumVersionRepository();
