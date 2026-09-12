// apps/api/src/modules/faculty-assignments/facultyAssignment.validation.ts

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────
// Create faculty assignment
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CreateFacultyAssignmentInput exactly — the only three fields
 * the model has beyond its own generated id/timestamps: `subjectOfferingId`,
 * `subjectComponentId`, `facultyUserId`. All three are required, matching
 * the non-nullable, no-default `SubjectOffering`/`SubjectComponent`/`User`
 * foreign keys on `FacultyAssignment`.
 *
 * `facultyUserId` here is the faculty member BEING assigned. The
 * authenticated actor performing the assignment is a separate
 * service-method parameter (`actorUserId`), never a field on this body —
 * there is no such column on the `FacultyAssignment` model.
 *
 * No `id`, `createdAt`, `updatedAt`, `actorUserId`, `assignedByUserId`,
 * `tenantId`, `academicYearId`, `programId`, `departmentId`,
 * `curriculumVersionId`, `semesterCatalogId`, `status`, `role`, or
 * `workload` is accepted — none of them exist on
 * `CreateFacultyAssignmentInput`, and none exist as columns on the
 * `FacultyAssignment` model.
 *
 * Unknown keys are silently stripped by Zod's default object behavior,
 * matching createSubjectOfferingBodySchema / createSemesterEnrollmentBodySchema
 * and every other sibling create schema in this project — no `.strict()`
 * is used here since none is used anywhere else.
 *
 * The `@@unique([subjectOfferingId, subjectComponentId])` duplicate-
 * assignment constraint is NOT checked here — that is a
 * database/repository concern, not a structural-validity concern. Nor is
 * whether `subjectComponentId` actually belongs to `subjectOfferingId`'s
 * Subject, or whether `facultyUserId` holds a faculty-capable role —
 * both are service/RBAC concerns.
 */
export const createFacultyAssignmentBodySchema = z.object({
  subjectOfferingId: z.uuid('Subject offering ID must be a valid UUID'),
  subjectComponentId: z.uuid('Subject component ID must be a valid UUID'),
  facultyUserId: z.uuid('Faculty user ID must be a valid UUID'),
});
export type CreateFacultyAssignmentBody = z.infer<typeof createFacultyAssignmentBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Faculty assignment ID params
// ─────────────────────────────────────────────────────────────────────────

export const facultyAssignmentIdParamsSchema = z.object({
  id: z.uuid('Faculty assignment ID must be a valid UUID'),
});
export type FacultyAssignmentIdParams = z.infer<typeof facultyAssignmentIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List faculty assignments query
// ─────────────────────────────────────────────────────────────────────────

const FACULTY_ASSIGNMENT_LIST_DEFAULT_PAGE_SIZE = 20;
const FACULTY_ASSIGNMENT_LIST_MAX_PAGE_SIZE = 100;

/**
 * Filters match ListFacultyAssignmentsFilters exactly — `subjectOfferingId`,
 * `subjectComponentId`, `facultyUserId` only. No `search`:
 * FacultyAssignment has no own human-readable field for a text search to
 * target (matching listSubjectOfferingsQuerySchema's identical reasoning).
 * No `academicYearId`/`programId`/`departmentId`/`curriculumVersionId`/
 * `semesterCatalogId` — none of these are stored on FacultyAssignment;
 * they are only reachable by joining through `subjectOfferingId` (and
 * beyond), and nothing in this repository establishes relation-traversal
 * filtering as an existing pattern.
 *
 * sortBy is an explicit allow-list matching
 * ListFacultyAssignmentsOptions['sortBy'] exactly (`createdAt` |
 * `updatedAt` — the only two non-FK scalar fields this model has) so an
 * arbitrary string can never reach a Prisma `orderBy`. page/limit use
 * z.coerce.number() since query params arrive as strings, same mechanism
 * as every sibling list-query schema.
 */
export const listFacultyAssignmentsQuerySchema = z.object({
  subjectOfferingId: z.uuid('Subject offering ID must be a valid UUID').optional(),
  subjectComponentId: z.uuid('Subject component ID must be a valid UUID').optional(),
  facultyUserId: z.uuid('Faculty user ID must be a valid UUID').optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, `Limit must be between 1 and ${FACULTY_ASSIGNMENT_LIST_MAX_PAGE_SIZE}`)
    .max(
      FACULTY_ASSIGNMENT_LIST_MAX_PAGE_SIZE,
      `Limit must be between 1 and ${FACULTY_ASSIGNMENT_LIST_MAX_PAGE_SIZE}`,
    )
    .default(FACULTY_ASSIGNMENT_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListFacultyAssignmentsQuery = z.infer<typeof listFacultyAssignmentsQuerySchema>;
