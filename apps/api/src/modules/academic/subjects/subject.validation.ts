// apps/api/src/modules/academic/subjects/subject.validation.ts

import { z } from 'zod';

/**
 * HTTP-boundary validation for the Subject module. Answers only "is this
 * HTTP input structurally valid?" — never whether the referenced
 * SemesterCatalog or ElectiveGroup exists, whether `code` is unique
 * within that SemesterCatalog, whether `isElective`/`electiveGroupId`
 * agree, or whether the caller is authorized. Those belong to
 * subject.service.ts / subject.repository.ts / the authorization layer,
 * not this file — subject.mapper.ts / subject.repository.ts /
 * subject.service.ts are all currently empty, so none of those layers
 * exist yet to defer to; this file does not anticipate or partially
 * implement them.
 *
 * subject.types.ts remains the domain contract (CreateSubjectInput,
 * UpdateSubjectInput, ListSubjectsFilters, ListSubjectsOptions). This
 * file defines the narrower HTTP input shapes and exports its own
 * inferred types, matching department.validation.ts /
 * program.validation.ts / curriculum.validation.ts /
 * semester.validation.ts exactly (`export const xBodySchema = ...;
 * export type XBody = z.infer<...>`).
 *
 * ── semesterCatalogId: structural only, and absent from update ──────
 * On create, `semesterCatalogId` is validated as "syntactically a
 * UUID," nothing more — matching every sibling module's identical
 * treatment of its own parent-reference id. `updateSubjectBodySchema`
 * has NO `semesterCatalogId` key at all — subject.types.ts's
 * `UpdateSubjectInput` excludes it entirely (see that file's doc
 * comment: SubjectComponent, SubjectOffering, and
 * StudentElectiveSelection all reference a Subject by id, and
 * reassigning its SemesterCatalog afterward would retroactively move
 * already-taught/scheduled/assessed academic history into a different
 * curriculum semester). As with every sibling schema in this codebase
 * (none of which call `.strict()`), a `semesterCatalogId` sent on a
 * PATCH is simply stripped by Zod's default object behavior rather than
 * rejected or accepted — it never reaches the service layer as a
 * recognized field.
 *
 * ── electiveGroupId: UUID, optional on create, nullable+optional on
 *    update ───────────────────────────────────────────────────────────
 * `ElectiveGroup.id` is `@id @default(uuid())` in schema.prisma, so
 * `z.uuid()` is the correct structural check, same as every other
 * cross-module id reference in this codebase. On create it is
 * `.optional()` only — omitting it is how a caller creates a core
 * subject (subject.types.ts's CreateSubjectInput has no `| null`
 * variant; there is no "existing value" to distinguish "don't touch"
 * from on create). On update it is `.nullable().optional()` — matching
 * user.validation.ts's `avatarUrl: z.url().nullable().optional()` for
 * the identical "optional AND nullable" shape — so three states survive
 * validation distinctly: key omitted (leave unchanged), a valid UUID
 * (reassign), and explicit `null` (clear back to a core subject). Zod's
 * `.nullable().optional()` composition does not collapse `null` into
 * `undefined`, so this satisfies subject.types.ts's
 * `UpdateSubjectInput.electiveGroupId?: ElectiveGroupId | null` exactly.
 *
 * ── isElective/electiveGroupId cross-field rule: NOT enforced here ──
 * subject.types.ts is explicit that these two fields are independent
 * and DB-unenforced (no CHECK constraint ties them). No sibling
 * validation file in this codebase establishes a cross-field
 * `.superRefine`/`.refine` convention for an analogous pair — searched
 * department/program/curriculum/semester/role/user validation and found
 * none. Per this task's own instruction, absence of an established
 * convention means this file does not invent one: `isElective: true`
 * with no `electiveGroupId`, and `isElective: false` with an
 * `electiveGroupId` present, both pass structural validation here. If
 * this pair should agree, that is a service-layer domain rule to add
 * later, not a gap in this file.
 *
 * ── isElective: real boolean, no query-style coercion in the body ───
 * JSON request bodies provide real booleans in Express — `z.boolean()`
 * is used as-is for create/update, matching
 * `programDurationYearsSchema`'s reasoning that body fields need no
 * string-to-number/boolean coercion, unlike query parameters. Not given
 * `.default(false)` on create despite the DB's `@default(false)` —
 * `createCurriculumVersionBodySchema.status` leaves an analogous
 * DB-defaulted field as plain `.optional()` with no Zod-level default,
 * and that precedent is followed rather than duplicating the database
 * default at this layer.
 *
 * ── isElective query filter: explicit two-value coercion ────────────
 * `queryBooleanSchema` below is copied verbatim from
 * role.validation.ts's `listRolesQuerySchema.isSystemDefined`.
 * `z.coerce.boolean()` is deliberately NOT used — `Boolean("false")`
 * evaluates to `true`, so it would silently misinterpret the literal
 * query string `isElective=false` as `true`, a correctness bug, not a
 * style choice. Only the two literal strings `"true"`/`"false"` are
 * accepted and explicitly mapped; anything else (`"1"`, `"yes"`) fails
 * validation with a clear message.
 *
 * ── code: no character-class regex, length bound reused ─────────────
 * Nothing in schema.prisma constrains `Subject.code` beyond
 * `@@unique([semesterCatalogId, code])`, and real subject codes vary
 * ("CS301", "HU301", longer or mixed-case equivalents elsewhere) — the
 * same reasoning department.validation.ts / program.validation.ts apply
 * to their own `code` fields. `SUBJECT_CODE_MAX_LENGTH` reuses
 * `DEPARTMENT_CODE_MAX_LENGTH` / `PROGRAM_CODE_MAX_LENGTH`'s value (20)
 * for the same reason program.validation.ts reused department's: no
 * dedicated short-code convention exists to derive an independent
 * number from, so the closest existing "code-like field" bound is
 * reused for consistency.
 *
 * ── name: length bound reused from name/label fields ─────────────────
 * `SUBJECT_NAME_MAX_LENGTH` reuses `DEPARTMENT_NAME_MAX_LENGTH` /
 * `PROGRAM_NAME_MAX_LENGTH` / `CURRICULUM_VERSION_LABEL_MAX_LENGTH`'s
 * value (150) — a human-facing display string ("Data Structures",
 * "Database Management Systems") with no schema-imposed limit, same
 * reasoning as every sibling name/label field.
 *
 * ── sortBy is an explicit whitelist ──────────────────────────────────
 * `listSubjectsQuerySchema` restricts `sortBy` to exactly the three
 * keys `ListSubjectsOptions` (subject.types.ts) declares
 * ('code' | 'name' | 'createdAt'). The repository will build a Prisma
 * `orderBy` from this value directly, so a bare `z.string()` would let
 * client input control query shape — the same reasoning every sibling
 * module's `sortBy` field follows.
 *
 * ── no offering/component/enrollment/faculty fields ──────────────────
 * The Prisma `Subject` model has exactly five own-fields
 * (semesterCatalogId, electiveGroupId, code, name, isElective) plus
 * timestamps; `components`, `offerings`, and `electiveSelections` are
 * back-references from SubjectComponent/SubjectOffering/
 * StudentElectiveSelection, not Subject input. None of those domains'
 * fields are introduced here, matching subject.types.ts's own
 * file-level scoping.
 */

// ─────────────────────────────────────────────────────────────────────────
// Subject code
// ─────────────────────────────────────────────────────────────────────────

const SUBJECT_CODE_MAX_LENGTH = 20;

const subjectCodeSchema = z
  .string()
  .trim()
  .min(1, 'Subject code is required')
  .max(
    SUBJECT_CODE_MAX_LENGTH,
    `Subject code must be at most ${SUBJECT_CODE_MAX_LENGTH} characters`,
  );

// ─────────────────────────────────────────────────────────────────────────
// Subject name
// ─────────────────────────────────────────────────────────────────────────

const SUBJECT_NAME_MAX_LENGTH = 150;

const subjectNameSchema = z
  .string()
  .trim()
  .min(1, 'Subject name is required')
  .max(
    SUBJECT_NAME_MAX_LENGTH,
    `Subject name must be at most ${SUBJECT_NAME_MAX_LENGTH} characters`,
  );

// ─────────────────────────────────────────────────────────────────────────
// Create subject
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CreateSubjectInput exactly: semesterCatalogId, code, name are
 * required (non-nullable, no-default columns); electiveGroupId and
 * isElective are both optional, matching the model's nullable FK and
 * `@default(false)` respectively. `id`, `createdAt`, `updatedAt` are
 * database-generated and excluded, same convention as every sibling
 * create schema. semesterCatalogId references an existing SemesterCatalog
 * by plain UUID — nested `semesterCatalog: {...}` creation is not
 * offered, matching CreateSemesterCatalogInput's identical convention.
 */
export const createSubjectBodySchema = z.object({
  semesterCatalogId: z.uuid(),
  code: subjectCodeSchema,
  name: subjectNameSchema,
  electiveGroupId: z.uuid().optional(),
  isElective: z.boolean().optional(),
});
export type CreateSubjectBody = z.infer<typeof createSubjectBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Update subject
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors UpdateSubjectInput exactly: code, name, electiveGroupId, and
 * isElective are all independently optional; semesterCatalogId has no
 * key at all (see file-level note above). `electiveGroupId` is
 * `.nullable().optional()`, not merely `.optional()` — see the
 * file-level "electiveGroupId" note for why this is the one field in
 * this file that needs both. Rejects an empty body via `.refine`,
 * matching updateDepartmentBodySchema / updateProgramBodySchema /
 * updateCurriculumVersionBodySchema / updateSemesterCatalogBodySchema
 * exactly, including the exact message wording.
 */
export const updateSubjectBodySchema = z
  .object({
    code: subjectCodeSchema.optional(),
    name: subjectNameSchema.optional(),
    electiveGroupId: z.uuid().nullable().optional(),
    isElective: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateSubjectBody = z.infer<typeof updateSubjectBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Subject ID params
// ─────────────────────────────────────────────────────────────────────────

/**
 * `id` (not `subjectId`) — matches departmentIdParamsSchema /
 * programIdParamsSchema / curriculumVersionIdParamsSchema /
 * semesterCatalogIdParamsSchema's convention for generic
 * single-resource routes. Subject.id is `@id @default(uuid())` in
 * schema.prisma, so a UUID check is correct here, same as every other
 * module's ID params schema.
 */
export const subjectIdParamsSchema = z.object({
  id: z.uuid(),
});
export type SubjectIdParams = z.infer<typeof subjectIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List subjects query
// ─────────────────────────────────────────────────────────────────────────

const SUBJECT_LIST_DEFAULT_PAGE_SIZE = 20;
const SUBJECT_LIST_MAX_PAGE_SIZE = 100;
const SUBJECT_SEARCH_MAX_LENGTH = 200;

/**
 * Copied verbatim from role.validation.ts's `listRolesQuerySchema.isSystemDefined`
 * — see the file-level "isElective query filter" note for why
 * `z.coerce.boolean()` is unsafe here.
 */
const queryBooleanSchema = z.enum(['true', 'false']).transform((value) => value === 'true');

/**
 * Combines ListSubjectsFilters (search, semesterCatalogId,
 * electiveGroupId, isElective) and ListSubjectsOptions (page, limit,
 * sortBy, sortOrder) into a single query schema, matching every sibling
 * module's identical Filters+Options merge.
 *
 * `page`/`limit` use `z.coerce.number()` since Express query params
 * arrive as strings — the established coercion mechanism in every list
 * query schema in this codebase. Defaults (20 / max 100) and the search
 * max length (200) reuse the exact values already established by
 * listDepartmentsQuerySchema / listProgramsQuerySchema /
 * listCurriculumVersionsQuerySchema, not new numbers.
 *
 * `semesterCatalogId`/`electiveGroupId` are validated as structural
 * UUIDs only — they narrow the result set; whether those rows exist is
 * irrelevant to a list query (it simply returns zero rows), matching
 * every sibling list query's identical treatment of its own FK filters.
 *
 * `sortBy` is whitelisted to exactly ListSubjectsOptions's three keys.
 * What "search" matches against (name vs. code, contains vs. prefix,
 * case sensitivity) is a repository-layer concern, not validated here.
 */
export const listSubjectsQuerySchema = z.object({
  search: z.string().trim().min(1).max(SUBJECT_SEARCH_MAX_LENGTH).optional(),
  semesterCatalogId: z.uuid().optional(),
  electiveGroupId: z.uuid().optional(),
  isElective: queryBooleanSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(SUBJECT_LIST_MAX_PAGE_SIZE)
    .default(SUBJECT_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['code', 'name', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>;
