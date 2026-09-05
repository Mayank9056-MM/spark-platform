// apps/api/src/modules/semester-enrollments/semesterEnrollment.validation.ts

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────
// Lifecycle status enum
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors schema.prisma's SemesterEnrollmentStatus enum exactly (7
 * values). Used only for the list-query `status` filter — never
 * accepted on create. There is no update/status-transition schema in
 * this file: lifecycle transitions are the outcome of a
 * PromotionDecision (a separate domain), not a generic status setter
 * exposed here.
 */
const semesterEnrollmentStatusSchema = z.enum([
  'IN_PROGRESS',
  'PROMOTED',
  'REPEATED',
  'DETAINED',
  'WITHDRAWN',
  'DISCONTINUED',
  'GRADUATED',
]);

// ─────────────────────────────────────────────────────────────────────────
// Create semester enrollment
// ─────────────────────────────────────────────────────────────────────────

/**
 * Only the three identity/context references SemesterEnrollment actually
 * requires from the caller — matches CreateSemesterEnrollmentInput
 * exactly. `attemptNumber` and `status` are deliberately absent, not
 * merely optional:
 *
 * - `attemptNumber` is service-derived. It counts how many times this
 *   studentEnrollmentId has already attempted this semesterCatalogId,
 *   which only the service can determine correctly (and safely, under
 *   concurrency) at creation time. Accepting it from the client would
 *   let a caller fabricate or skip academic attempts.
 * - `status` always begins at the schema's `IN_PROGRESS` default. A
 *   client supplying `status: "PROMOTED"` (or any other value) would
 *   bypass the promotion workflow that is supposed to be the only path
 *   to a status change.
 *
 * Unknown keys (e.g. a client sending `attemptNumber`, `status`,
 * `programId`, `curriculumVersionId`, `userId`, `admissionId`, `id`, or
 * timestamps alongside these) are silently stripped by Zod's default
 * object behavior, matching createStudentEnrollmentBodySchema and every
 * other sibling create schema in this project — no `.strict()` is used
 * here since none is used anywhere else.
 */
export const createSemesterEnrollmentBodySchema = z.object({
  studentEnrollmentId: z.uuid('Student enrollment ID must be a valid UUID'),
  semesterCatalogId: z.uuid('Semester catalog ID must be a valid UUID'),
  academicYearId: z.uuid('Academic year ID must be a valid UUID'),
});
export type CreateSemesterEnrollmentBody = z.infer<typeof createSemesterEnrollmentBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Semester enrollment ID params
// ─────────────────────────────────────────────────────────────────────────

export const semesterEnrollmentIdParamsSchema = z.object({
  id: z.uuid('Semester enrollment ID must be a valid UUID'),
});
export type SemesterEnrollmentIdParams = z.infer<typeof semesterEnrollmentIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List semester enrollments query
// ─────────────────────────────────────────────────────────────────────────

const SEMESTER_ENROLLMENT_LIST_DEFAULT_PAGE_SIZE = 20;
const SEMESTER_ENROLLMENT_LIST_MAX_PAGE_SIZE = 100;

/**
 * Filters match ListSemesterEnrollmentsFilters exactly — no invented
 * fields (no search, no curriculumVersionId/programId/userId/admissionId,
 * no derived semesterNumber/totalSemesters). SemesterEnrollment has no
 * own human-readable field for a text search to target; a meaningful
 * search would require joining StudentEnrollment.rollNumber,
 * AcademicYear.label, or SemesterCatalog.number, which this module's
 * repository does not establish.
 *
 * sortBy is an explicit allow-list matching
 * ListSemesterEnrollmentsOptions['sortBy'] so an arbitrary string can
 * never reach a Prisma `orderBy`. page/limit/attemptNumber use
 * z.coerce.number() since query params arrive as strings — same
 * mechanism as every sibling list-query schema.
 */
export const listSemesterEnrollmentsQuerySchema = z.object({
  studentEnrollmentId: z.uuid('Student enrollment ID must be a valid UUID').optional(),
  semesterCatalogId: z.uuid('Semester catalog ID must be a valid UUID').optional(),
  academicYearId: z.uuid('Academic year ID must be a valid UUID').optional(),
  attemptNumber: z.coerce
    .number('Attempt number must be a positive integer')
    .int('Attempt number must be a positive integer')
    .min(1, 'Attempt number must be a positive integer')
    .optional(),
  status: semesterEnrollmentStatusSchema.optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, `Limit must be between 1 and ${SEMESTER_ENROLLMENT_LIST_MAX_PAGE_SIZE}`)
    .max(
      SEMESTER_ENROLLMENT_LIST_MAX_PAGE_SIZE,
      `Limit must be between 1 and ${SEMESTER_ENROLLMENT_LIST_MAX_PAGE_SIZE}`,
    )
    .default(SEMESTER_ENROLLMENT_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['attemptNumber', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListSemesterEnrollmentsQuery = z.infer<typeof listSemesterEnrollmentsQuerySchema>;
