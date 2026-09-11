// apps/api/src/modules/subject-offerings/subjectOffering.validation.ts

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────
// Create subject offering
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CreateSubjectOfferingInput exactly — the only two fields the
 * model has beyond its own generated id/timestamps: `subjectId` and
 * `academicYearId`. Both are required, matching the non-nullable,
 * no-default `Subject`/`AcademicYear` foreign keys on `SubjectOffering`.
 *
 * No `id`, `createdAt`, `updatedAt`, `status`, `sectionId`,
 * `curriculumVersionId`, `semesterCatalogId`, `tenantId`, `facultyId`,
 * or any other field is accepted — none of them exist on
 * `CreateSubjectOfferingInput`, and none exist as columns on the
 * `SubjectOffering` model.
 *
 * Unknown keys are silently stripped by Zod's default object behavior,
 * matching createSemesterEnrollmentBodySchema / createAdmissionBodySchema
 * and every other sibling create schema in this project — no `.strict()`
 * is used here since none is used anywhere else.
 *
 * The `@@unique([subjectId, academicYearId])` duplicate-offering
 * constraint is NOT checked here — that is a database/repository
 * concern, not a structural-validity concern.
 */
export const createSubjectOfferingBodySchema = z.object({
  subjectId: z.uuid('Subject ID must be a valid UUID'),
  academicYearId: z.uuid('Academic year ID must be a valid UUID'),
});
export type CreateSubjectOfferingBody = z.infer<typeof createSubjectOfferingBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Subject offering ID params
// ─────────────────────────────────────────────────────────────────────────

export const subjectOfferingIdParamsSchema = z.object({
  id: z.uuid('Subject offering ID must be a valid UUID'),
});
export type SubjectOfferingIdParams = z.infer<typeof subjectOfferingIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List subject offerings query
// ─────────────────────────────────────────────────────────────────────────

const SUBJECT_OFFERING_LIST_DEFAULT_PAGE_SIZE = 20;
const SUBJECT_OFFERING_LIST_MAX_PAGE_SIZE = 100;

/**
 * Filters match ListSubjectOfferingsFilters exactly — `subjectId` and
 * `academicYearId` only. No `search`: SubjectOffering has no own
 * human-readable field for a text search to target (matching
 * listSemesterEnrollmentsQuerySchema's identical reasoning). No
 * `status`/`sectionId`/`programId`/`curriculumVersionId`/
 * `semesterCatalogId`/`facultyId`/`tenantId` — none of these exist on
 * `ListSubjectOfferingsFilters`, and adding any would require a join the
 * repository does not establish.
 *
 * sortBy is an explicit allow-list matching
 * ListSubjectOfferingsOptions['sortBy'] exactly (`createdAt` |
 * `updatedAt` — the only two non-FK scalar fields this model has) so an
 * arbitrary string can never reach a Prisma `orderBy`. page/limit use
 * z.coerce.number() since query params arrive as strings, same mechanism
 * as every sibling list-query schema.
 */
export const listSubjectOfferingsQuerySchema = z.object({
  subjectId: z.uuid('Subject ID must be a valid UUID').optional(),
  academicYearId: z.uuid('Academic year ID must be a valid UUID').optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, `Limit must be between 1 and ${SUBJECT_OFFERING_LIST_MAX_PAGE_SIZE}`)
    .max(
      SUBJECT_OFFERING_LIST_MAX_PAGE_SIZE,
      `Limit must be between 1 and ${SUBJECT_OFFERING_LIST_MAX_PAGE_SIZE}`,
    )
    .default(SUBJECT_OFFERING_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListSubjectOfferingsQuery = z.infer<typeof listSubjectOfferingsQuerySchema>;
