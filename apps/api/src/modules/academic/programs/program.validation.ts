// apps/api/src/modules/academic/programs/program.validation.ts

import { z } from 'zod';

/**
 * HTTP-boundary validation for the Program module. Answers only "is this
 * HTTP input structurally valid?" — never whether the referenced
 * Department exists, whether a Program code is already taken, or
 * whether the caller is authorized. Those belong to
 * program.service.ts / program.repository.ts / the authorization layer,
 * not this file.
 *
 * program.types.ts remains the domain contract (CreateProgramInput,
 * UpdateProgramInput, ListProgramsFilters, ListProgramsOptions). This
 * file does not redefine those interfaces — it defines the narrower HTTP
 * input shapes and exports its own inferred types, matching the
 * department.validation.ts / role.validation.ts convention
 * (`export const xBodySchema = ...; export type XBody = z.infer<...>`).
 *
 * ── departmentId: structural only ───────────────────────────────────
 * departmentId is validated as "syntactically a UUID," nothing more.
 * Whether a Department with that id actually exists is a question that
 * requires a database round-trip, which does not belong at the HTTP
 * validation boundary — it belongs to ProgramService, which is also
 * where a not-found Department turns into the correct domain error.
 *
 * ── departmentId is absent from update, not merely optional ────────
 * UpdateProgramInput (program.types.ts) has no departmentId field at
 * all, and its doc comment explains why: CurriculumVersion,
 * StudentEnrollment, and Admission rows already reference a Program by
 * id once one exists, so silently moving a Program to a different
 * Department would change what department owns that history with no
 * schema-level guard against it. updateProgramBodySchema below has no
 * departmentId key for the same reason. As with every other schema in
 * this codebase (none of which call `.strict()`), an unrecognized key
 * in the request body is stripped by Zod's default object behavior
 * rather than causing a validation error — so a client that sends
 * `departmentId` on a PATCH has it silently dropped before it ever
 * reaches the service layer, not accepted as a valid update field.
 *
 * ── code IS mutable in update, unlike Department.code ───────────────
 * UpdateProgramInput includes `code?: string`. This is a deliberate
 * departure from updateDepartmentBodySchema (which excludes `code`
 * entirely) — department.types.ts's argument for Department.code being
 * immutable rests on it being an institutional external reference, an
 * argument that program.types.ts explicitly notes has no independent
 * basis for Program.code in the current schema/repository. Validation
 * follows the domain contract as written; updateProgramBodySchema
 * accepts `code` using the identical rules as create.
 *
 * ── sortBy is an explicit whitelist ──────────────────────────────────
 * listProgramsQuerySchema restricts sortBy to exactly the three keys
 * ListProgramsOptions declares ('name' | 'code' | 'createdAt'). A bare
 * z.string() here would let a client-controlled value reach a Prisma
 * `orderBy`, so — as with every other list-query schema in this
 * codebase — it is an enum, not a string.
 *
 * ── no curriculum/semester/subject/elective/admission fields ────────
 * The Program model in schema.prisma has exactly five own-fields
 * (name, code, departmentId, durationYears, totalSemesters) plus
 * timestamps; its `curriculumVersions`, `studentEnrollments`, and
 * `admissions` relations are back-references from other models, not
 * Program input. No admissionType/curriculumId/semesterId/etc. fields
 * are introduced here — those domains don't yet exist as Program input
 * per the schema, and this module intentionally stays decoupled from
 * them (see program.types.ts's own file-level comment).
 */

// ─────────────────────────────────────────────────────────────────────────
// Program name
// ─────────────────────────────────────────────────────────────────────────

/**
 * Max length matches DEPARTMENT_NAME_MAX_LENGTH / ROLE_DISPLAY_NAME_MAX_LENGTH
 * — a human-facing display label with no schema-imposed limit (Prisma
 * `String` maps to unbounded Postgres `text`), so the same conservative
 * bound already established for comparable name fields is reused rather
 * than inventing a new number. No character-class regex is imposed:
 * legitimate program names ("B.Tech", "M.Tech", "Computer Science &
 * Engineering") use punctuation that a restrictive pattern would reject.
 */
const PROGRAM_NAME_MAX_LENGTH = 150;

const programNameSchema = z
  .string()
  .trim()
  .min(1, 'Program name is required')
  .max(
    PROGRAM_NAME_MAX_LENGTH,
    `Program name must be at most ${PROGRAM_NAME_MAX_LENGTH} characters`,
  );

// ─────────────────────────────────────────────────────────────────────────
// Program code
// ─────────────────────────────────────────────────────────────────────────

/**
 * No character-class regex — schema.prisma constrains Program.code only
 * via `@@unique([code])`, and real program codes vary widely (CSE, IT,
 * AI, BTECH-CSE, MCA). Only emptiness/whitespace and unreasonable length
 * are rejected, matching department.validation.ts's identical reasoning
 * for Department.code.
 *
 * PROGRAM_CODE_MAX_LENGTH reuses DEPARTMENT_CODE_MAX_LENGTH's value.
 * That number is itself a flagged, non-schema-derived assumption in
 * department.validation.ts — there is still no dedicated short-code
 * convention elsewhere to inspect for Program specifically, so the
 * closest existing "code-like field" bound is reused for consistency
 * rather than inventing an independent number.
 */
const PROGRAM_CODE_MAX_LENGTH = 20;

const programCodeSchema = z
  .string()
  .trim()
  .min(1, 'Program code is required')
  .max(
    PROGRAM_CODE_MAX_LENGTH,
    `Program code must be at most ${PROGRAM_CODE_MAX_LENGTH} characters`,
  );

// ─────────────────────────────────────────────────────────────────────────
// Duration years / total semesters
// ─────────────────────────────────────────────────────────────────────────

/**
 * Both are non-nullable `Int` columns in schema.prisma with no default
 * and no CHECK constraint. Plain `z.number()` (not `z.coerce.number()`)
 * is used because these are JSON request-body fields, not query-string
 * values — unlike page/limit below, there is no string-to-number
 * coercion step needed for a JSON body, matching this codebase's
 * existing pattern of only using z.coerce.* for query parameters.
 *
 * `.int()` rejects decimals, NaN, and (since Number.isInteger(Infinity)
 * is false) Infinity in one constraint. `.positive()` additionally
 * rejects zero and negative values. Rejecting zero is treated as
 * structural rather than a domain rule here — a program cannot have a
 * zero-year duration or zero semesters under any interpretation, which
 * is different in kind from a specific domain rule like "must be 2, 3,
 * 4, or 5 years." No maximum is imposed, since nothing in the schema or
 * this repository establishes one.
 *
 * The durationYears/totalSemesters relationship (e.g. semesters =
 * years * 2) is deliberately NOT cross-validated here.
 * program.types.ts's own doc comment notes that SemesterCatalog derives
 * a semester's academic year FROM these two fields, but nowhere in the
 * schema or codebase is a fixed multiplier established as an invariant.
 * Inventing one here would be exactly the kind of unrequested business
 * rule this module must not add — if such an invariant is ever adopted,
 * it belongs in the service/domain layer, not HTTP validation.
 */
const programDurationYearsSchema = z
  .number()
  .int('Duration years must be an integer')
  .positive('Duration years must be a positive integer');

const programTotalSemestersSchema = z
  .number()
  .int('Total semesters must be an integer')
  .positive('Total semesters must be a positive integer');

// ─────────────────────────────────────────────────────────────────────────
// Create program
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CreateProgramInput exactly: name, code, departmentId,
 * durationYears, totalSemesters — all required, matching the schema's
 * non-nullable, no-default columns. `id`, `createdAt`, `updatedAt` are
 * database-generated and excluded, same convention as
 * createDepartmentBodySchema. departmentId references an existing
 * Department by plain UUID — nested `department: {...}` creation is not
 * offered, matching CreateProgramInput's own design.
 */
export const createProgramBodySchema = z.object({
  name: programNameSchema,
  code: programCodeSchema,
  departmentId: z.uuid(),
  durationYears: programDurationYearsSchema,
  totalSemesters: programTotalSemestersSchema,
});
export type CreateProgramBody = z.infer<typeof createProgramBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Update program
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors UpdateProgramInput exactly: name, code, durationYears, and
 * totalSemesters are all independently optional; departmentId has no
 * key at all (see file-level note above). Rejects an empty body via
 * `.refine`, matching updateDepartmentBodySchema / updateRoleBodySchema
 * / updateUserBodySchema exactly.
 */
export const updateProgramBodySchema = z
  .object({
    name: programNameSchema.optional(),
    code: programCodeSchema.optional(),
    durationYears: programDurationYearsSchema.optional(),
    totalSemesters: programTotalSemestersSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateProgramBody = z.infer<typeof updateProgramBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Program ID params
// ─────────────────────────────────────────────────────────────────────────

/**
 * `id` (not `programId`) — matches departmentIdParamsSchema /
 * roleIdParamsSchema's convention for generic single-resource routes.
 * Program.id is `@id @default(uuid())` in schema.prisma, so a UUID
 * check is correct here, same as every other module's ID params schema.
 */
export const programIdParamsSchema = z.object({
  id: z.uuid(),
});
export type ProgramIdParams = z.infer<typeof programIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List programs query
// ─────────────────────────────────────────────────────────────────────────

const PROGRAM_LIST_DEFAULT_PAGE_SIZE = 20;
const PROGRAM_LIST_MAX_PAGE_SIZE = 100;
const PROGRAM_SEARCH_MAX_LENGTH = 200;

/**
 * Combines ListProgramsFilters (search, departmentId) and
 * ListProgramsOptions (page, limit, sortBy, sortOrder) into a single
 * query schema, matching listDepartmentsQuerySchema's identical
 * Filters+Options merge.
 *
 * `page`/`limit` use `z.coerce.number()` since Express query params
 * arrive as strings — the established coercion mechanism in every list
 * query schema in this codebase. Defaults (20 / max 100) and the search
 * max length (200) reuse the exact values already established by
 * listDepartmentsQuerySchema / listRolesQuerySchema, not new numbers.
 *
 * `departmentId` is validated as a structural UUID only — it narrows
 * the result set to Programs under that Department; whether that
 * Department exists is irrelevant to a list query (it simply returns
 * zero rows), so no existence check belongs here either.
 *
 * `sortBy` is whitelisted to exactly ListProgramsOptions's three keys.
 * `durationYears`/`totalSemesters`/`departmentId` are deliberately not
 * offered as sort keys, matching program.types.ts's own reasoning.
 *
 * What "search" matches against (name vs. code, contains vs. prefix,
 * case sensitivity) is a repository-layer concern, not validated here.
 */
export const listProgramsQuerySchema = z.object({
  search: z.string().trim().min(1).max(PROGRAM_SEARCH_MAX_LENGTH).optional(),
  departmentId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PROGRAM_LIST_MAX_PAGE_SIZE)
    .default(PROGRAM_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['name', 'code', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListProgramsQuery = z.infer<typeof listProgramsQuerySchema>;
