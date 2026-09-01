// apps/api/src/modules/academic/electives/elective.validation.ts

import { z } from 'zod';

/**
 * HTTP-boundary validation for the ElectiveGroup module. Answers only "is
 * this HTTP input structurally valid?" — never whether the referenced
 * SemesterCatalog exists, whether an ElectiveGroup name is already taken
 * within that SemesterCatalog, whether `minSelect <= maxSelect`, whether
 * tightening `maxSelect` conflicts with existing
 * StudentElectiveSelection rows, whether the group is safe to delete, or
 * whether the caller is authorized. Those all belong to
 * elective.service.ts / elective.repository.ts / the authorization
 * layer, not this file.
 *
 * elective.types.ts remains the domain contract
 * (CreateElectiveGroupInput, UpdateElectiveGroupInput,
 * ListElectiveGroupsFilters, ListElectiveGroupsOptions). This file
 * defines the narrower HTTP input shapes and exports its own inferred
 * types, matching subject.validation.ts / semester.validation.ts /
 * program.validation.ts / department.validation.ts exactly
 * (`export const xBodySchema = ...; export type XBody = z.infer<...>`).
 *
 * ── semesterCatalogId: structural only, and absent from update ──────
 * On create, `semesterCatalogId` is validated as "syntactically a
 * UUID," nothing more — matching every sibling module's identical
 * treatment of its own parent-reference id (subjectCatalogId in
 * subject.validation.ts, curriculumVersionId in
 * semester.validation.ts, departmentId in program.validation.ts).
 * Whether that SemesterCatalog actually exists is a database question
 * for ElectiveGroupService. `updateElectiveGroupBodySchema` has NO
 * `semesterCatalogId` key at all — elective.types.ts's
 * `UpdateElectiveGroupInput` excludes it entirely (see that file's doc
 * comment: Subject.electiveGroupId and
 * StudentElectiveSelection.electiveGroupId both already reference an
 * ElectiveGroup by id once populated, and reassigning its
 * SemesterCatalog afterward would retroactively move an
 * already-populated, possibly already-selected-from elective group into
 * a different curriculum semester with no schema-level cascade or guard
 * against it). As with every other schema in this codebase (none of
 * which call `.strict()`), a `semesterCatalogId` sent on a PATCH is
 * simply stripped by Zod's default object behavior rather than rejected
 * or accepted — it never reaches the service layer as a recognized
 * field.
 *
 * ── name: length bound reused from established name/label fields ────
 * `ELECTIVE_GROUP_NAME_MAX_LENGTH` reuses `DEPARTMENT_NAME_MAX_LENGTH` /
 * `PROGRAM_NAME_MAX_LENGTH` / `SUBJECT_NAME_MAX_LENGTH`'s value (150) —
 * a human-facing display string ("Open Elective Group 1", "Professional
 * Elective I") with no schema-imposed limit (`ElectiveGroup.name` is a
 * plain, unconstrained `String` column), same reasoning every sibling
 * name field already applies. Surrounding whitespace is trimmed
 * (`"  Professional Elective I  "` -> `"Professional Elective I"`,
 * matching subjectNameSchema/programNameSchema's identical `.trim()`);
 * emptiness after trimming is rejected. No character-class regex is
 * imposed — real elective-group names vary freely, same as every
 * sibling name field's reasoning.
 *
 * `name` is used identically on create and update (see
 * `electiveGroupNameSchema` below, shared by both), matching this
 * task's own "Create/Update consistency" requirement — there is no
 * reason for stricter or looser name rules depending on which operation
 * is being validated.
 *
 * ── minSelect / maxSelect: structural bounds only, independently ────
 * Both are validated as positive integers on both create and update —
 * matching `programDurationYearsSchema` / `programTotalSemestersSchema`
 * in program.validation.ts and `semesterNumberSchema` in
 * semester.validation.ts, the established structural treatment for a
 * non-nullable schema `Int` column with a DB default and no CHECK
 * constraint. Both fields are `.optional()` on create (matching
 * `CreateElectiveGroupInput.minSelect?` / `.maxSelect?` — the DB default
 * of `1` applies when omitted, same "has-a-default, nothing marks it
 * protected" reasoning `createCurriculumVersionBodySchema.status`
 * establishes) and independently `.optional()` on update, sharing the
 * exact same schema instances as create so the structural rules cannot
 * drift between the two operations.
 *
 * This file deliberately does NOT enforce `minSelect <= maxSelect`.
 * elective.types.ts is explicit that no CHECK constraint ties these two
 * columns together in the schema, and no sibling validation file in
 * this codebase establishes a cross-field `.refine`/`.superRefine`
 * convention for an analogous pair (searched subject/department/
 * program/semester/curriculum validation and found none — see
 * subject.validation.ts's identical conclusion for its own
 * isElective/electiveGroupId pair). Per this task's own instruction,
 * absence of an established convention means this file does not invent
 * one: `{ minSelect: 3, maxSelect: 1 }` passes structural validation
 * here. Whether that combination is a valid domain configuration — and
 * whether an update to either value is safe against existing
 * StudentElectiveSelection rows — is elective.service.ts's
 * responsibility, not this file's.
 *
 * No upper bound is imposed on either field beyond "positive integer" —
 * nothing in schema.prisma or this repository establishes a maximum
 * selection count, matching `programDurationYearsSchema` /
 * `semesterNumberSchema`'s identical refusal to invent an unevidenced
 * ceiling.
 *
 * ── sortBy is an explicit whitelist ──────────────────────────────────
 * `listElectiveGroupsQuerySchema` restricts `sortBy` to exactly the two
 * keys `ListElectiveGroupsOptions` (elective.types.ts) declares
 * ('name' | 'createdAt'). The repository builds a Prisma `orderBy` from
 * this value directly, so a bare `z.string()` would let client input
 * control query shape — the same reasoning every sibling module's
 * `sortBy` field follows (subject's `code | name | createdAt`,
 * semester's `number | createdAt`).
 *
 * ── no minSelect/maxSelect list filters, no subjects/selections ─────
 * `ListElectiveGroupsFilters` (elective.types.ts) offers only `search`
 * and `semesterCatalogId` — `minSelect`/`maxSelect` are deliberately
 * NOT list filters (no evidenced admin need, matching that file's own
 * reasoning), so they are not present on
 * `listElectiveGroupsQuerySchema` either. Nested `subjects` /
 * `selections` request bodies are never accepted on create or update —
 * ElectiveGroup creation does not create Subjects or
 * StudentElectiveSelections; those belong to their own modules, and (as
 * with every sibling schema, none of which use `.strict()`) any such
 * keys sent by a client are silently stripped by Zod's default object
 * behavior rather than rejected or accepted.
 */

// ─────────────────────────────────────────────────────────────────────────
// Elective group name
// ─────────────────────────────────────────────────────────────────────────

const ELECTIVE_GROUP_NAME_MAX_LENGTH = 150;

const electiveGroupNameSchema = z
  .string()
  .trim()
  .min(1, 'Elective group name is required')
  .max(
    ELECTIVE_GROUP_NAME_MAX_LENGTH,
    `Elective group name must be at most ${ELECTIVE_GROUP_NAME_MAX_LENGTH} characters`,
  );

// ─────────────────────────────────────────────────────────────────────────
// minSelect / maxSelect
// ─────────────────────────────────────────────────────────────────────────

/**
 * Shared by create and update so the structural rules cannot drift
 * between the two operations (see file-level "Create/Update
 * consistency" note). Deliberately does NOT cross-check against a
 * sibling field or any upper bound — see the file-level "minSelect /
 * maxSelect" note for why.
 */
const electiveGroupMinSelectSchema = z
  .number()
  .int('minSelect must be an integer')
  .positive('minSelect must be a positive integer');

const electiveGroupMaxSelectSchema = z
  .number()
  .int('maxSelect must be an integer')
  .positive('maxSelect must be a positive integer');

// ─────────────────────────────────────────────────────────────────────────
// Create elective group
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CreateElectiveGroupInput exactly: semesterCatalogId and name
 * are required (non-nullable, no-default columns); minSelect and
 * maxSelect are both optional, matching the model's `@default(1)` on
 * each. `id`, `createdAt`, `updatedAt` are database-generated and
 * excluded, same convention as every sibling create schema.
 * semesterCatalogId references an existing SemesterCatalog by plain
 * UUID — nested `semesterCatalog: {...}` creation is not offered,
 * matching CreateSubjectInput.semesterCatalogId's identical convention.
 */
export const createElectiveGroupBodySchema = z.object({
  semesterCatalogId: z.uuid(),
  name: electiveGroupNameSchema,
  minSelect: electiveGroupMinSelectSchema.optional(),
  maxSelect: electiveGroupMaxSelectSchema.optional(),
});
export type CreateElectiveGroupBody = z.infer<typeof createElectiveGroupBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Update elective group
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors UpdateElectiveGroupInput exactly: name, minSelect, and
 * maxSelect are all independently optional; semesterCatalogId has no
 * key at all (see file-level note above). Rejects an empty body via
 * `.refine`, matching updateSubjectBodySchema /
 * updateSemesterCatalogBodySchema / updateProgramBodySchema /
 * updateDepartmentBodySchema exactly, including the exact message
 * wording.
 */
export const updateElectiveGroupBodySchema = z
  .object({
    name: electiveGroupNameSchema.optional(),
    minSelect: electiveGroupMinSelectSchema.optional(),
    maxSelect: electiveGroupMaxSelectSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateElectiveGroupBody = z.infer<typeof updateElectiveGroupBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Elective group ID params
// ─────────────────────────────────────────────────────────────────────────

/**
 * `id` (not `electiveGroupId`) — matches subjectIdParamsSchema /
 * semesterCatalogIdParamsSchema / programIdParamsSchema /
 * departmentIdParamsSchema's convention for generic single-resource
 * routes. ElectiveGroup.id is `@id @default(uuid())` in schema.prisma,
 * so a UUID check is correct here, same as every other module's ID
 * params schema.
 */
export const electiveGroupIdParamsSchema = z.object({
  id: z.uuid(),
});
export type ElectiveGroupIdParams = z.infer<typeof electiveGroupIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List elective groups query
// ─────────────────────────────────────────────────────────────────────────

const ELECTIVE_GROUP_LIST_DEFAULT_PAGE_SIZE = 20;
const ELECTIVE_GROUP_LIST_MAX_PAGE_SIZE = 100;
const ELECTIVE_GROUP_SEARCH_MAX_LENGTH = 200;

/**
 * Combines ListElectiveGroupsFilters (search, semesterCatalogId) and
 * ListElectiveGroupsOptions (page, limit, sortBy, sortOrder) into a
 * single query schema, matching listSubjectsQuerySchema /
 * listSemesterCatalogsQuerySchema's identical Filters+Options merge.
 *
 * `page`/`limit` use `z.coerce.number()` since Express query params
 * arrive as strings — the established coercion mechanism in every list
 * query schema in this codebase. Defaults (20 / max 100) and the search
 * max length (200) reuse the exact values already established by
 * listSubjectsQuerySchema / listProgramsQuerySchema /
 * listDepartmentsQuerySchema, not new numbers.
 *
 * `semesterCatalogId` is validated as a structural UUID only — it
 * narrows the result set; whether that SemesterCatalog exists is
 * irrelevant to a list query (it simply returns zero rows), matching
 * every sibling list query's identical treatment of its own FK filter.
 *
 * `sortBy` is whitelisted to exactly ListElectiveGroupsOptions's two
 * keys. What "search" matches against (name, contains vs. prefix, case
 * sensitivity) is a repository-layer concern, not validated here.
 */
export const listElectiveGroupsQuerySchema = z.object({
  search: z.string().trim().min(1).max(ELECTIVE_GROUP_SEARCH_MAX_LENGTH).optional(),
  semesterCatalogId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ELECTIVE_GROUP_LIST_MAX_PAGE_SIZE)
    .default(ELECTIVE_GROUP_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['name', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListElectiveGroupsQuery = z.infer<typeof listElectiveGroupsQuerySchema>;
