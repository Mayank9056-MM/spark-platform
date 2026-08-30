// apps/api/src/modules/academic/curricula/curriculum.validation.ts

import { z } from 'zod';

/**
 * HTTP-boundary validation for the CurriculumVersion module. Answers
 * only "is this HTTP input structurally valid?" — never whether the
 * referenced Program exists, whether a (programId, label) pair is
 * already taken, whether a status transition is legal, or whether the
 * caller is authorized. Those belong to curriculum.service.ts /
 * curriculum.repository.ts / the authorization layer, not this file.
 *
 * curriculum.types.ts remains the domain contract
 * (CreateCurriculumVersionInput, UpdateCurriculumVersionInput,
 * ListCurriculumVersionsFilters, ListCurriculumVersionsOptions). This
 * file defines the narrower HTTP input shapes and exports its own
 * inferred types, matching department.validation.ts / program.validation.ts
 * exactly (`export const xBodySchema = ...; export type XBody = z.infer<...>`).
 *
 * ── programId: structural only ──────────────────────────────────────
 * programId is validated as "syntactically a UUID," nothing more —
 * matching program.validation.ts's identical treatment of departmentId.
 * Whether a Program with that id exists is a database question that
 * belongs to CurriculumVersionService, not this boundary.
 *
 * ── programId is absent from update, not merely optional ───────────
 * UpdateCurriculumVersionInput (curriculum.types.ts) has no programId
 * field, and its doc comment explains why: StudentEnrollment and
 * Admission rows already reference a CurriculumVersion by id, so
 * silently moving it to a different Program would change what Program
 * owns that enrollment/admission history with no schema-level guard
 * against it. updateCurriculumVersionBodySchema below has no programId
 * key for the same reason. As with every other schema in this codebase
 * (none of which call `.strict()`), a `programId` sent on a PATCH is
 * simply stripped by Zod's default object behavior rather than
 * rejected or accepted.
 *
 * ── status: shape only, no transition rules ─────────────────────────
 * `status` is validated against the exact three domain values
 * (DRAFT | ACTIVE | RETIRED) on both create and update. Whether a given
 * transition (e.g. RETIRED -> DRAFT) is legal, or whether more than one
 * ACTIVE version may exist per Program, is a service-layer state-machine
 * concern — nothing in schema.prisma encodes those rules either (no
 * partial unique index restricts status), so this file doesn't invent
 * them.
 *
 * ── sortBy is an explicit whitelist ──────────────────────────────────
 * listCurriculumVersionsQuerySchema restricts sortBy to exactly the
 * three keys ListCurriculumVersionsOptions declares
 * ('label' | 'status' | 'createdAt'). The repository builds a Prisma
 * `orderBy` from this value directly, so a bare z.string() here would
 * let client input control query shape — the same reasoning
 * program.validation.ts / department.validation.ts apply to their own
 * sortBy fields.
 *
 * ── no semester/subject/elective/enrollment fields ──────────────────
 * The CurriculumVersion model has exactly three own-fields (programId,
 * label, status) plus timestamps; its `semesterCatalogs`,
 * `studentEnrollments`, and `admissions` relations are back-references,
 * not CurriculumVersion input. None of those domains' fields are
 * introduced here.
 */

// ─────────────────────────────────────────────────────────────────────────
// Curriculum status
// ─────────────────────────────────────────────────────────────────────────

/**
 * Exactly the three values curriculum.types.ts's `CurriculumStatus`
 * declares. Shared between create and update — both accept the same
 * enum, with no additional values and no renaming.
 */
const curriculumStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'RETIRED']);

// ─────────────────────────────────────────────────────────────────────────
// Curriculum label
// ─────────────────────────────────────────────────────────────────────────

/**
 * Max length reuses DEPARTMENT_NAME_MAX_LENGTH / PROGRAM_NAME_MAX_LENGTH's
 * value (150) rather than the shorter *_CODE_MAX_LENGTH (20) bound.
 * `label` is a human-facing display string ("CSE 2024", "B.Tech Revised
 * Syllabus 2026") with no schema-imposed limit (Prisma `String` maps to
 * unbounded Postgres `text`) and — unlike Department.code/Program.code —
 * curriculum.types.ts is explicit that nothing establishes `label` as a
 * short external reference code. The existing name-field bound is reused
 * rather than inventing a new number.
 */
const CURRICULUM_VERSION_LABEL_MAX_LENGTH = 150;

const curriculumVersionLabelSchema = z
  .string()
  .trim()
  .min(1, 'Curriculum label is required')
  .max(
    CURRICULUM_VERSION_LABEL_MAX_LENGTH,
    `Curriculum label must be at most ${CURRICULUM_VERSION_LABEL_MAX_LENGTH} characters`,
  );

// ─────────────────────────────────────────────────────────────────────────
// Create curriculum version
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CreateCurriculumVersionInput exactly: programId and label are
 * required (non-nullable, no-default columns); status is optional,
 * matching the model's `@default(DRAFT)`. `id`, `createdAt`, `updatedAt`
 * are database-generated and excluded, same convention as
 * createDepartmentBodySchema / createProgramBodySchema. programId
 * references an existing Program by plain UUID — nested
 * `program: {...}` creation is not offered.
 */
export const createCurriculumVersionBodySchema = z.object({
  programId: z.uuid(),
  label: curriculumVersionLabelSchema,
  status: curriculumStatusSchema.optional(),
});
export type CreateCurriculumVersionBody = z.infer<typeof createCurriculumVersionBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Update curriculum version
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors UpdateCurriculumVersionInput exactly: label and status are
 * both independently optional; programId has no key at all (see
 * file-level note above). Rejects an empty body via `.refine`, matching
 * updateDepartmentBodySchema / updateProgramBodySchema exactly.
 */
export const updateCurriculumVersionBodySchema = z
  .object({
    label: curriculumVersionLabelSchema.optional(),
    status: curriculumStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateCurriculumVersionBody = z.infer<typeof updateCurriculumVersionBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Curriculum version ID params
// ─────────────────────────────────────────────────────────────────────────

/**
 * `id` (not `curriculumVersionId`) — matches departmentIdParamsSchema /
 * programIdParamsSchema's convention for generic single-resource routes.
 * CurriculumVersion.id is `@id @default(uuid())` in schema.prisma, so a
 * UUID check is correct here, same as every other module's ID params
 * schema.
 */
export const curriculumVersionIdParamsSchema = z.object({
  id: z.uuid(),
});
export type CurriculumVersionIdParams = z.infer<typeof curriculumVersionIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List curriculum versions query
// ─────────────────────────────────────────────────────────────────────────

const CURRICULUM_VERSION_LIST_DEFAULT_PAGE_SIZE = 20;
const CURRICULUM_VERSION_LIST_MAX_PAGE_SIZE = 100;
const CURRICULUM_VERSION_SEARCH_MAX_LENGTH = 200;

/**
 * Combines ListCurriculumVersionsFilters (search, programId, status) and
 * ListCurriculumVersionsOptions (page, limit, sortBy, sortOrder) into a
 * single query schema, matching listProgramsQuerySchema's identical
 * Filters+Options merge.
 *
 * `page`/`limit` use `z.coerce.number()` since Express query params
 * arrive as strings — the established coercion mechanism in every list
 * query schema in this codebase. Defaults (20 / max 100) and the search
 * max length (200) reuse the exact values already established by
 * listDepartmentsQuerySchema / listProgramsQuerySchema, not new numbers.
 *
 * `programId` is validated as a structural UUID only, matching
 * listProgramsQuerySchema's `departmentId` — it narrows the result set;
 * whether that Program exists is irrelevant to a list query (it simply
 * returns zero rows).
 *
 * `sortBy` is whitelisted to exactly ListCurriculumVersionsOptions's
 * three keys. What "search" matches against (label, contains vs.
 * prefix, case sensitivity) is a repository-layer concern, not
 * validated here.
 */
export const listCurriculumVersionsQuerySchema = z.object({
  search: z.string().trim().min(1).max(CURRICULUM_VERSION_SEARCH_MAX_LENGTH).optional(),
  programId: z.uuid().optional(),
  status: curriculumStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(CURRICULUM_VERSION_LIST_MAX_PAGE_SIZE)
    .default(CURRICULUM_VERSION_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['label', 'status', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListCurriculumVersionsQuery = z.infer<typeof listCurriculumVersionsQuerySchema>;
