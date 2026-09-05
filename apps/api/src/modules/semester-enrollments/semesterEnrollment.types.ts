// apps/api/src/modules/semester-enrollments/semesterEnrollment.types.ts

import type { SemesterCatalogId } from '../academic/SemesterCatalog/semester.types.js';
import type { AcademicYearId } from '../academic-years/academic-year.types.js';
import type { StudentEnrollmentId } from '../student-enrollments/studentEnrollment.types.js';

/**
 * A SemesterEnrollment is one ATTEMPT at one curriculum semester, during
 * one real academic year, by a StudentEnrollment:
 *
 *   Admission -> StudentEnrollment -> SemesterEnrollment ->
 *     StudentSubjectEnrollment-equivalents (Attendance/Assignments/
 *     Electives) -> Results
 *
 * StudentEnrollment answers "which program/curriculum does this student
 * belong to" (a long-lived identity). SemesterEnrollment answers "which
 * semester, in which academic year, for which attempt" — a repeatable,
 * historical fact. A StudentEnrollment has MANY SemesterEnrollment rows
 * over time; this is never modeled as one-to-one.
 *
 * Deliberately NOT represented here, and why:
 * - semester NUMBER: lives on SemesterCatalog.number, reached via
 *   semesterCatalogId. Storing it again on SemesterEnrollment would be a
 *   second source of truth. No sibling DTO (see semester.types.ts /
 *   curriculum.types.ts) exposes a denormalized parent-derived scalar
 *   either, so nothing here breaks that pattern.
 * - totalSemesters: belongs to Program, reached via
 *   StudentEnrollment.programId. Not this module's concern.
 * - curriculumVersionId: already carried by StudentEnrollment. The
 *   service must confirm `semesterCatalog.curriculumVersionId ===
 *   studentEnrollment.curriculumVersionId` at write time, but that is a
 *   runtime invariant, not a field to duplicate here.
 * - isFirstSemester / isFinalSemester: both derived (from
 *   Admission.entrySemesterCatalogId and from
 *   SemesterCatalog.number + Program.totalSemesters, respectively).
 *   Encoding either as a stored/DTO field would create a second source
 *   of truth the service would then have to keep in sync.
 * - promotion relations (openedByDecision / promotionDecisions): owned
 *   by the promotion domain. Exposing them on the core DTO would couple
 *   an ordinary SemesterEnrollment read to loading the entire promotion
 *   history for that row.
 *
 * A repeat is NOT a special case requiring dedicated fields — it is just
 * another SemesterEnrollment row with the same studentEnrollmentId and
 * semesterCatalogId, a new academicYearId, and an incremented
 * attemptNumber. The type shape below supports this directly.
 */

export type SemesterEnrollmentId = string;

/** Mirrors schema.prisma's SemesterEnrollmentStatus enum exactly (7 values). */
export type SemesterEnrollmentStatus =
  'IN_PROGRESS' | 'PROMOTED' | 'REPEATED' | 'DETAINED' | 'WITHDRAWN' | 'DISCONTINUED' | 'GRADUATED';

/**
 * The API-safe representation of a SemesterEnrollment. Deliberately NOT
 * the Prisma model — `studentEnrollment`, `semesterCatalog`,
 * `academicYear`, `openedByDecision`, `attendanceRecords`,
 * `assignmentSubmissions`, `electiveSelections`, and
 * `promotionDecisions` are all omitted, matching every sibling DTO's
 * convention (e.g. `SemesterCatalogDTO` representing its parent as
 * `curriculumVersionId` only, not a nested object). An ordinary
 * SemesterEnrollment lookup/list must never force loading academic
 * activity or promotion history.
 *
 * `attemptNumber` and `status` are the two fields genuinely intrinsic to
 * this row beyond its three identity FKs.
 *
 * Dates are ISO strings, matching `StudentEnrollmentDTO` /
 * `AcademicYearDTO` / `SemesterCatalogDTO`'s identical
 * persistence-Date-to-API-string boundary.
 */
export interface SemesterEnrollmentDTO {
  readonly id: SemesterEnrollmentId;
  readonly studentEnrollmentId: StudentEnrollmentId;
  readonly semesterCatalogId: SemesterCatalogId;
  readonly academicYearId: AcademicYearId;
  readonly attemptNumber: number;
  readonly status: SemesterEnrollmentStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Fields a caller may supply when opening a SemesterEnrollment. `id`,
 * `createdAt`, `updatedAt`, and `status` are excluded for the same
 * reasons as every sibling `CreateXInput` (`status` additionally because
 * a client must never be able to open a semester enrollment in anything
 * but the schema's `IN_PROGRESS` default — see the note on `status`
 * under "why no generic update input" below).
 *
 * `attemptNumber` is EXCLUDED, not merely defaulted. It is not a
 * client-supplied fact about the world (unlike, say, a roll number) —
 * it is a count of how many times this StudentEnrollment has already
 * attempted this SemesterCatalog, which only the service can know
 * correctly at the moment of creation (by counting existing
 * SemesterEnrollment rows for the same `(studentEnrollmentId,
 * semesterCatalogId)` pair and adding one). Letting a client supply it
 * directly would let arbitrary callers manufacture or skip academic
 * attempts — exactly the kind of progression manipulation this module's
 * spec calls out to prevent. This mirrors
 * `CreateStudentEnrollmentInput` excluding `userId`/`programId`/
 * `curriculumVersionId` because those are derived server-side from the
 * referenced Admission rather than supplied by the caller.
 *
 * `academicYearId` IS accepted here, unlike `attemptNumber`. Unlike
 * attempt count, the academic year in which an attempt occurs is
 * genuinely an administrative decision (e.g. "open this repeat in
 * 2028-29"), not a value the service can derive from existing rows.
 */
export interface CreateSemesterEnrollmentInput {
  readonly studentEnrollmentId: StudentEnrollmentId;
  readonly semesterCatalogId: SemesterCatalogId;
  readonly academicYearId: AcademicYearId;
}

/**
 * No `UpdateSemesterEnrollmentInput` is defined.
 *
 * SemesterEnrollment is historical academic data. Its four identity/
 * context fields — `studentEnrollmentId`, `semesterCatalogId`,
 * `academicYearId`, `attemptNumber` — must stay immutable after
 * creation (rewriting any of them would retroactively change which
 * student, curriculum semester, term, or attempt a row of attendance/
 * assignment/elective/promotion history is understood to belong to,
 * exactly as `curriculum.types.ts` / `semester.types.ts` argue for their
 * own excluded FKs).
 *
 * `status` is the only field left, and it is deliberately NOT exposed as
 * `{ status?: SemesterEnrollmentStatus }`. Status transitions here are
 * not free-form — they are the *outcome* of a PromotionDecision
 * (`PromotionOutcome`: PROMOTE/REPEAT/WITHDRAW/DISCONTINUE/GRADUATE),
 * which itself belongs to the separate promotion domain and is not
 * modeled in this file (see the module header). A generic
 * `PATCH /semester-enrollments/:id { status: "PROMOTED" }` would let a
 * caller bypass that workflow entirely — precisely what this module's
 * spec prohibits. No sibling module in this codebase currently
 * establishes a narrower, justified mutable field for SemesterEnrollment
 * either (contrast `AcademicYear.label` or `CurriculumVersion.label`,
 * both plain display strings with no such lifecycle coupling), so unlike
 * those two update inputs, no update contract is introduced here at all
 * rather than inventing one.
 *
 * If a future promotion-workflow command needs to transition status,
 * that belongs to the promotion module's own command inputs (e.g. acting
 * on `PromotionDecision`), not a generic update on this type.
 */

/**
 * Filtering only — pagination/sorting live in
 * `ListSemesterEnrollmentsOptions`, matching the Filters/Options split
 * used by every sibling module (`ListStudentEnrollmentsFilters` /
 * `ListStudentEnrollmentsOptions`, `ListSemesterCatalogsFilters` /
 * `ListSemesterCatalogsOptions`).
 *
 * All five fields are SemesterEnrollment's own scalars/FKs, each
 * schema-backed: `studentEnrollmentId` (part of the unique constraint
 * `@@unique([studentEnrollmentId, semesterCatalogId, attemptNumber])`),
 * `semesterCatalogId` (part of that same unique constraint),
 * `academicYearId` (`@@index([academicYearId, status])`),
 * `attemptNumber` (the remaining piece of the unique constraint), and
 * `status` (the other half of that same index).
 *
 * No `search` field — unlike `StudentEnrollment.rollNumber` or
 * `SemesterCatalog`/`CurriculumVersion`'s `label`, SemesterEnrollment has
 * no own human-readable string field for free text to match against; a
 * meaningful search would require joining into related entities
 * (student roll number, semester number, academic year label), which is
 * a repository/query-design capability this module's spec explicitly
 * says not to assume. No `curriculumVersionId` filter either — it is
 * not stored on this model (see the module header) and adding it here
 * would imply a join the repository does not yet establish. No
 * `programId` filter for the same reason.
 */
export interface ListSemesterEnrollmentsFilters {
  readonly studentEnrollmentId?: StudentEnrollmentId;
  readonly semesterCatalogId?: SemesterCatalogId;
  readonly academicYearId?: AcademicYearId;
  readonly attemptNumber?: number;
  readonly status?: SemesterEnrollmentStatus;
}

/**
 * Pagination + sort options, mirroring every sibling `ListXOptions`.
 * `sortBy` is a literal union restricted to fields the repository can
 * sort on directly without a join: `attemptNumber` (a genuine ordering
 * within a repeated semester) and `createdAt` (matching every sibling
 * module's inclusion of the creation timestamp). Relation/derived
 * fields such as academic year label or semester number are excluded,
 * matching `ListSemesterCatalogsOptions` excluding `curriculumVersionId`
 * and `ListProgramsOptions` excluding `departmentId` for the identical
 * "FK/derived value, not a safe direct sort key" reason.
 */
export interface ListSemesterEnrollmentsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'attemptNumber' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListSemesterEnrollmentsResult {
  readonly semesterEnrollments: readonly SemesterEnrollmentDTO[];
  readonly total: number;
}
