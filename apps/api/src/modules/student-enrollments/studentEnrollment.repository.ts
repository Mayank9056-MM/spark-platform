// apps/api/src/modules/student-enrollments/studentEnrollment.repository.ts

import type { Prisma, PrismaClient, StudentEnrollment } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';
import type { CurriculumVersionId } from '../academic/curricula/curriculum.types.js';
import type { ProgramId } from '../academic/programs/program.types.js';
import type { AdmissionId } from '../admissions/admission.types.js';

import type {
  ListStudentEnrollmentsFilters,
  ListStudentEnrollmentsOptions,
} from './studentEnrollment.types.js';

/**
 * As with AdmissionRepository/AcademicYearRepository, mutating methods take
 * an explicit Prisma transaction client rather than closing over the
 * module-level `prisma` singleton, so the service can wrap a StudentEnrollment
 * mutation together with its audit-log write (and, for create, the Admission
 * lookup) in one `prisma.$transaction(...)`. Read-only methods use the
 * singleton by default; a `*Tx` counterpart exists only where a documented
 * workflow must read the row inside the SAME transaction that later writes
 * it, to avoid a stale-read race against the transaction's own work.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export interface StudentEnrollmentListQueryResult {
  readonly studentEnrollments: StudentEnrollment[];
  readonly total: number;
}

/**
 * Persistence payload for creation — deliberately NOT the domain
 * CreateStudentEnrollmentInput (admissionId + rollNumber only). The service
 * loads Admission and derives userId/programId/curriculumVersionId/
 * admissionDate before calling this repository; Admission is never queried
 * here. `status` is omitted — schema.prisma's `@default(ACTIVE)` sets it.
 */
export interface CreateStudentEnrollmentPersistenceInput {
  readonly admissionId: AdmissionId;
  readonly userId: string;
  readonly programId: ProgramId;
  readonly curriculumVersionId: CurriculumVersionId;
  readonly rollNumber: string;
  readonly admissionDate: Date;
}

/**
 * No delete operation — StudentEnrollment is permanent historical academic
 * data; ACTIVE -> CANCELLED and ACTIVE -> WITHDRAWN are the only terminal
 * transitions, each a dedicated atomic command, never a generic status
 * setter.
 *
 * userId is NOT unique: a User may accumulate multiple StudentEnrollment
 * rows over a lifetime. `findActiveByUserId`/`findActiveByUserIdTx` use
 * `findFirst`, never `findUnique({ where: { userId } })` — the actual
 * invariant ("at most one ACTIVE row per user") is a partial constraint
 * Prisma's schema DSL cannot express, and is enforced solely by Postgres's
 * `student_enrollments_one_active_per_user_idx`. This repository never
 * treats a prior read as the concurrency guarantee.
 */
export class StudentEnrollmentRepository {
  async findById(id: string): Promise<StudentEnrollment | null> {
    return prisma.studentEnrollment.findUnique({ where: { id } });
  }

  async findByIdTx(tx: Db, id: string): Promise<StudentEnrollment | null> {
    return tx.studentEnrollment.findUnique({ where: { id } });
  }

  /** admissionId is @unique. */
  async findByAdmissionId(admissionId: string): Promise<StudentEnrollment | null> {
    return prisma.studentEnrollment.findUnique({ where: { admissionId } });
  }

  /**
   * Transaction-scoped counterpart, for the create workflow's
   * "no enrollment already exists for this admission" check — read inside
   * the same transaction that later calls create(), consistent with the
   * transaction's own snapshot.
   */
  async findByAdmissionIdTx(tx: Db, admissionId: string): Promise<StudentEnrollment | null> {
    return tx.studentEnrollment.findUnique({ where: { admissionId } });
  }

  /** Friendly pre-check only — the @unique constraint on admissionId is final. */
  async existsByAdmissionId(admissionId: string): Promise<boolean> {
    const count = await prisma.studentEnrollment.count({ where: { admissionId } });
    return count > 0;
  }

  /** rollNumber is @unique. */
  async findByRollNumber(rollNumber: string): Promise<StudentEnrollment | null> {
    return prisma.studentEnrollment.findUnique({ where: { rollNumber } });
  }

  /**
   * Transaction-scoped counterpart, for the update workflow's roll-number
   * conflict check: the service needs the actual row (to compare `.id`
   * against the enrollment being updated), not just a boolean, since a
   * roll number "conflict" with itself is not a conflict.
   */
  async findByRollNumberTx(tx: Db, rollNumber: string): Promise<StudentEnrollment | null> {
    return tx.studentEnrollment.findUnique({ where: { rollNumber } });
  }

  /** Friendly pre-check only — the @unique constraint on rollNumber is final. */
  async existsByRollNumber(rollNumber: string): Promise<boolean> {
    const count = await prisma.studentEnrollment.count({ where: { rollNumber } });
    return count > 0;
  }

  /** userId is not unique — see class header. */
  async findActiveByUserId(userId: string): Promise<StudentEnrollment | null> {
    return prisma.studentEnrollment.findFirst({ where: { userId, status: 'ACTIVE' } });
  }

  /**
   * Transaction-scoped counterpart, for the create workflow's active-
   * enrollment check: must observe the same transaction snapshot as the
   * subsequent create() write.
   */
  async findActiveByUserIdTx(tx: Db, userId: string): Promise<StudentEnrollment | null> {
    return tx.studentEnrollment.findFirst({ where: { userId, status: 'ACTIVE' } });
  }

  async create(tx: Db, input: CreateStudentEnrollmentPersistenceInput): Promise<StudentEnrollment> {
    return tx.studentEnrollment.create({
      data: {
        admissionId: input.admissionId,
        userId: input.userId,
        programId: input.programId,
        curriculumVersionId: input.curriculumVersionId,
        rollNumber: input.rollNumber,
        admissionDate: input.admissionDate,
      },
    });
  }

  /** Only rollNumber is ever reachable through generic update. */
  async update(tx: Db, id: string, input: { rollNumber: string }): Promise<StudentEnrollment> {
    return tx.studentEnrollment.update({
      where: { id },
      data: { rollNumber: input.rollNumber },
    });
  }

  /**
   * Atomic conditional transition: only flips a row still ACTIVE.
   * `updateMany` (not `update`) because `update`'s `where` only accepts
   * unique fields and cannot express "and status is still ACTIVE" as a
   * precondition. `null` means either the id doesn't exist or the row was
   * not ACTIVE at the moment of this statement — the two are NOT reliably
   * distinguishable from any read the caller took earlier, since that read
   * may itself be stale by the time this statement runs. If the service
   * needs to tell those cases apart for a specific error message, it must
   * perform its own authoritative read after this call returns null.
   */
  async cancel(tx: Db, id: string, reason: string): Promise<StudentEnrollment | null> {
    const { count } = await tx.studentEnrollment.updateMany({
      where: { id, status: 'ACTIVE' },
      data: { status: 'CANCELLED', statusReason: reason, statusChangedAt: new Date() },
    });
    if (count === 0) {
      return null;
    }
    return tx.studentEnrollment.findUniqueOrThrow({ where: { id } });
  }

  /** Same atomic-guard shape and null semantics as cancel() above. */
  async withdraw(tx: Db, id: string, reason: string): Promise<StudentEnrollment | null> {
    const { count } = await tx.studentEnrollment.updateMany({
      where: { id, status: 'ACTIVE' },
      data: { status: 'WITHDRAWN', statusReason: reason, statusChangedAt: new Date() },
    });
    if (count === 0) {
      return null;
    }
    return tx.studentEnrollment.findUniqueOrThrow({ where: { id } });
  }

  /**
   * search matches rollNumber only — the same single-identifier-field
   * convention as AdmissionRepository's admissionNumber search, since
   * userId/admissionId/programId/curriculumVersionId are already exact-match
   * filters below, not fuzzy-search targets.
   */
  async list(
    filters: ListStudentEnrollmentsFilters,
    options: ListStudentEnrollmentsOptions,
  ): Promise<StudentEnrollmentListQueryResult> {
    const where: Prisma.StudentEnrollmentWhereInput = {
      ...(filters.status !== undefined && { status: filters.status }),
      ...(filters.userId !== undefined && { userId: filters.userId }),
      ...(filters.admissionId !== undefined && { admissionId: filters.admissionId }),
      ...(filters.programId !== undefined && { programId: filters.programId }),
      ...(filters.curriculumVersionId !== undefined && {
        curriculumVersionId: filters.curriculumVersionId,
      }),
      ...(filters.rollNumber !== undefined && { rollNumber: filters.rollNumber }),
      ...(filters.search && { rollNumber: { contains: filters.search, mode: 'insensitive' } }),
    };

    const [studentEnrollments, total] = await Promise.all([
      prisma.studentEnrollment.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.studentEnrollment.count({ where }),
    ]);

    return { studentEnrollments, total };
  }
}

export const studentEnrollmentRepository = new StudentEnrollmentRepository();
