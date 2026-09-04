import type { CurriculumVersionId } from '../academic/curricula/curriculum.types.js';
import type { ProgramId } from '../academic/programs/program.types.js';
import type { AdmissionId } from '../admissions/admission.types.js';

/**
 * StudentEnrollment is the student's long-lived academic enrollment
 * identity within one program/curriculum, produced by exactly one
 * Admission.
 *
 * A User may have multiple Admissions over a lifetime, each optionally
 * producing its own StudentEnrollment. At most one StudentEnrollment
 * may be ACTIVE for a user at a time; this invariant is enforced by
 * the service layer and a database partial unique index.
 */
export type StudentEnrollmentId = string;

/** Mirrors schema.prisma's StudentLifecycleStatus enum exactly. */
export type StudentLifecycleStatus =
  'ACTIVE' | 'ON_GAP_YEAR' | 'WITHDRAWN' | 'DISCONTINUED' | 'GRADUATED' | 'ALUMNI' | 'CANCELLED';

export interface StudentEnrollmentDTO {
  readonly id: StudentEnrollmentId;
  readonly admissionId: AdmissionId;
  readonly userId: string;
  readonly programId: ProgramId;
  readonly curriculumVersionId: CurriculumVersionId;
  readonly rollNumber: string;
  readonly admissionDate: string;
  readonly status: StudentLifecycleStatus;
  readonly statusReason: string | null;
  readonly statusChangedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Creates a StudentEnrollment from a confirmed Admission.
 *
 * The Admission is the source of truth for the student's:
 * - user identity
 * - initial program
 * - initial curriculum version
 * - admission date
 *
 * Those values must be loaded and derived by the service rather than
 * accepted from the caller.
 */
export interface CreateStudentEnrollmentInput {
  readonly admissionId: AdmissionId;
  readonly rollNumber: string;
}

/**
 * Only legitimately editable enrollment data belongs here.
 *
 * Lifecycle changes are handled through dedicated commands.
 */
export interface UpdateStudentEnrollmentInput {
  readonly rollNumber?: string;
}

export interface CancelStudentEnrollmentInput {
  readonly reason: string;
}

export interface WithdrawStudentEnrollmentInput {
  readonly reason: string;
}

export interface ListStudentEnrollmentsFilters {
  readonly search?: string;
  readonly status?: StudentLifecycleStatus;
  readonly userId?: string;
  readonly admissionId?: AdmissionId;
  readonly programId?: ProgramId;
  readonly curriculumVersionId?: CurriculumVersionId;
  readonly rollNumber?: string;
}

export interface ListStudentEnrollmentsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'rollNumber' | 'admissionDate' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListStudentEnrollmentsResult {
  readonly studentEnrollments: readonly StudentEnrollmentDTO[];
  readonly total: number;
}
