// apps/api/src/modules/academic/SemesterCatalog/semester.validation.ts

import { z } from 'zod';

/**
 * HTTP-boundary validation for the SemesterCatalog module. Answers only
 * "is this HTTP input structurally valid?" — never whether the
 * referenced CurriculumVersion exists, whether a (curriculumVersionId,
 * number) pair is already taken, or whether changing `number` is safe
 * given existing dependent academic records. Those all belong to
 * semester.service.ts / semester.repository.ts, not this file — in
 * particular, "a semester number cannot be changed once academic
 * records reference it" is a domain-safety rule, not a structural one,
 * and is deliberately NOT enforced here. See semester.service.ts's
 * `updateSemesterCatalog` and its class-level "WHY THIS FILE EXISTS"
 * note.
 *
 * semester.types.ts remains the domain contract
 * (CreateSemesterCatalogInput, UpdateSemesterCatalogInput,
 * ListSemesterCatalogsFilters, ListSemesterCatalogsOptions). This file
 * defines the narrower HTTP input shapes and exports its own inferred
 * types, matching curriculum.validation.ts / program.validation.ts /
 * department.validation.ts exactly (`export const xBodySchema = ...;
 * export type XBody = z.infer<...>`).
 *
 * ── curriculumVersionId: structural only, and absent from update ────
 * On create, `curriculumVersionId` is validated as "syntactically a
 * UUID," nothing more — whether that CurriculumVersion actually exists
 * is a database question for SemesterCatalogService, not this boundary.
 * `updateSemesterCatalogBodySchema` has NO `curriculumVersionId` key at
 * all — `semester.types.ts`'s `UpdateSemesterCatalogInput` excludes it
 * entirely (see that file's doc comment: SemesterEnrollment,
 * PromotionBatch, Timetable, Lecture, Subject, ElectiveGroup, and
 * Admission all reference a SemesterCatalog by id, and reassigning its
 * CurriculumVersion afterward would retroactively change what
 * curriculum that history belongs to). As with every other schema in
 * this codebase (none of which call `.strict()`), a `curriculumVersionId`
 * sent on a PATCH is simply stripped by Zod's default object behavior
 * rather than rejected or accepted.
 *
 * ── number: structural bounds only ───────────────────────────────────
 * `number` is validated as a positive integer on both create and
 * update — matching `programDurationYearsSchema`/
 * `programTotalSemestersSchema`'s identical `.int().positive()`
 * treatment in program.validation.ts, for the same reason: a
 * non-nullable schema `Int` column with no CHECK constraint and no
 * documented upper bound. Whether a *specific* number change is safe
 * given existing dependent records is a domain-safety decision this
 * file does not make — see the file-level note above.
 *
 * ── sortBy is an explicit whitelist ──────────────────────────────────
 * `listSemesterCatalogsQuerySchema` restricts `sortBy` to exactly the
 * two keys `ListSemesterCatalogsOptions` declares
 * ('number' | 'createdAt'). The repository builds a Prisma `orderBy`
 * from this value directly, so a bare `z.string()` here would let
 * client input control query shape — the same reasoning every sibling
 * module's `sortBy` field follows.
 *
 * `sortBy` defaults to `'createdAt'` / `sortOrder` to `'desc'`, matching
 * every sibling module's identical default exactly
 * (listDepartmentsQuerySchema / listProgramsQuerySchema /
 * listCurriculumVersionsQuerySchema all default the same way). An
 * argument could be made that a semester-structure listing is more
 * naturally viewed in `number` ascending order (Semester 1, 2, 3...) by
 * default — that is a real, undecided UX question, not something this
 * file resolves by invention; it defaults to the established, evidenced
 * convention instead.
 */

// ─────────────────────────────────────────────────────────────────────────
// Semester number
// ─────────────────────────────────────────────────────────────────────────

const semesterNumberSchema = z
  .number()
  .int('Semester number must be an integer')
  .positive('Semester number must be a positive integer');

// ─────────────────────────────────────────────────────────────────────────
// Create semester catalog
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CreateSemesterCatalogInput exactly: curriculumVersionId and
 * number are both required (non-nullable, no-default columns). `id`,
 * `createdAt`, `updatedAt` are database-generated and excluded, same
 * convention as createCurriculumVersionBodySchema. curriculumVersionId
 * references an existing CurriculumVersion by plain UUID — nested
 * `curriculumVersion: {...}` creation is not offered.
 */
export const createSemesterCatalogBodySchema = z.object({
  curriculumVersionId: z.uuid(),
  number: semesterNumberSchema,
});
export type CreateSemesterCatalogBody = z.infer<typeof createSemesterCatalogBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Update semester catalog
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors UpdateSemesterCatalogInput exactly: `number` is the only
 * field accepted; `curriculumVersionId` has no key at all (see
 * file-level note above). Rejects an empty body via `.refine`, matching
 * updateCurriculumVersionBodySchema / updateProgramBodySchema exactly.
 *
 * This schema only asserts "number, if present, is a positive integer."
 * It says nothing about whether THIS particular change is safe to make
 * — that check requires reading the database (dependent-record state),
 * which is out of scope for a structural HTTP-boundary schema. See the
 * file-level note above.
 */
export const updateSemesterCatalogBodySchema = z
  .object({
    number: semesterNumberSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateSemesterCatalogBody = z.infer<typeof updateSemesterCatalogBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Semester catalog ID params
// ─────────────────────────────────────────────────────────────────────────

/**
 * `id` (not `semesterCatalogId`) — matches
 * curriculumVersionIdParamsSchema / programIdParamsSchema's convention
 * for generic single-resource routes. SemesterCatalog.id is
 * `@id @default(uuid())` in schema.prisma, so a UUID check is correct
 * here, same as every other module's ID params schema.
 */
export const semesterCatalogIdParamsSchema = z.object({
  id: z.uuid(),
});
export type SemesterCatalogIdParams = z.infer<typeof semesterCatalogIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List semester catalogs query
// ─────────────────────────────────────────────────────────────────────────

const SEMESTER_CATALOG_LIST_DEFAULT_PAGE_SIZE = 20;
const SEMESTER_CATALOG_LIST_MAX_PAGE_SIZE = 100;

/**
 * Combines ListSemesterCatalogsFilters (curriculumVersionId, number)
 * and ListSemesterCatalogsOptions (page, limit, sortBy, sortOrder) into
 * a single query schema, matching listCurriculumVersionsQuerySchema's
 * identical Filters+Options merge.
 *
 * `page`/`limit`/`number` use `z.coerce.number()` since Express query
 * params arrive as strings — the established coercion mechanism in
 * every list query schema in this codebase. Default page size (20, max
 * 100) reuses the exact values already established by
 * listCurriculumVersionsQuerySchema, not new numbers.
 *
 * No `search` param — SemesterCatalog has no string field to search
 * against, matching semester.types.ts's ListSemesterCatalogsFilters
 * reasoning exactly.
 */
export const listSemesterCatalogsQuerySchema = z.object({
  curriculumVersionId: z.uuid().optional(),
  number: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(SEMESTER_CATALOG_LIST_MAX_PAGE_SIZE)
    .default(SEMESTER_CATALOG_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['number', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListSemesterCatalogsQuery = z.infer<typeof listSemesterCatalogsQuerySchema>;
