// apps/api/src/modules/academic/departments/department.validation.ts

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────
// Department name
// ─────────────────────────────────────────────────────────────────────────

/**
 * Max length matches role.validation.ts's ROLE_DISPLAY_NAME_MAX_LENGTH —
 * both are human-facing display labels with no schema-imposed length
 * limit (Prisma `String` maps to unbounded Postgres `text`), so the same
 * conservative bound is reused rather than inventing a new number.
 */
const DEPARTMENT_NAME_MAX_LENGTH = 150;

const departmentNameSchema = z
  .string()
  .trim()
  .min(1, 'Department name is required')
  .max(
    DEPARTMENT_NAME_MAX_LENGTH,
    `Department name must be at most ${DEPARTMENT_NAME_MAX_LENGTH} characters`,
  );

// ─────────────────────────────────────────────────────────────────────────
// Department code
// ─────────────────────────────────────────────────────────────────────────

/**
 * No character-class regex is imposed (unlike role.validation.ts's
 * ROLE_KEY_PATTERN) — nothing in schema.prisma or the existing codebase
 * constrains department code format beyond `@@unique([code])`, and the
 * task explicitly rules out guessing a restrictive pattern like
 * `/^[A-Z]{2,5}$/`. Real department codes vary across institutions (CS,
 * IT, MECH, EXTC, or longer/mixed-case equivalents elsewhere), so only
 * emptiness/whitespace-only and unreasonable length are rejected.
 *
 * DEPARTMENT_CODE_MAX_LENGTH (20) is a flagged assumption, not derived
 * from the schema or an existing convention — no other module has a
 * short-code field to mirror. It is generous enough for any realistic
 * department code while still preventing a caller from stuffing a
 * name-length value into this field.
 */
const DEPARTMENT_CODE_MAX_LENGTH = 20;

const departmentCodeSchema = z
  .string()
  .trim()
  .min(1, 'Department code is required')
  .max(
    DEPARTMENT_CODE_MAX_LENGTH,
    `Department code must be at most ${DEPARTMENT_CODE_MAX_LENGTH} characters`,
  );

// ─────────────────────────────────────────────────────────────────────────
// Create department
// ─────────────────────────────────────────────────────────────────────────

export const createDepartmentBodySchema = z.object({
  name: departmentNameSchema,
  code: departmentCodeSchema,
});
export type CreateDepartmentBody = z.infer<typeof createDepartmentBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Update department
// ─────────────────────────────────────────────────────────────────────────

/**
 * Only `name` is mutable at the HTTP boundary — matches
 * UpdateDepartmentInput exactly. `code` and `id` are intentionally never
 * accepted here (see the file-level "CODE IMMUTABILITY" note; `id`
 * belongs in the URL params, validated separately by
 * departmentIdParamsSchema below).
 *
 * Rejects an empty body via `.refine`, mirroring
 * updateRoleBodySchema/updateUserBodySchema exactly: a PATCH with no
 * fields is not a meaningful request, and letting it through would mean
 * the controller silently no-ops rather than validation catching a
 * client mistake early.
 */
export const updateDepartmentBodySchema = z
  .object({
    name: departmentNameSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateDepartmentBody = z.infer<typeof updateDepartmentBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Department ID params
// ─────────────────────────────────────────────────────────────────────────

/**
 * `id` (not `departmentId`) — matches roleIdParamsSchema's naming for
 * generic single-resource routes; schema.prisma's `Department.id` is
 * `@id @default(uuid())`, so a UUID check is correct here, same as every
 * other module's ID params schema.
 */
export const departmentIdParamsSchema = z.object({
  id: z.uuid(),
});
export type DepartmentIdParams = z.infer<typeof departmentIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List departments query
// ─────────────────────────────────────────────────────────────────────────

const DEPARTMENT_LIST_DEFAULT_PAGE_SIZE = 20;
const DEPARTMENT_LIST_MAX_PAGE_SIZE = 100;
const DEPARTMENT_SEARCH_MAX_LENGTH = 200;

/**
 * `page`/`limit` use `z.coerce.number()` — Express query params arrive as
 * strings, and this is the established coercion mechanism in every other
 * list-query schema (listRolesQuerySchema, listRoleAssignmentsQuerySchema).
 * No manual `Number(req.query.page)` parsing belongs in the controller.
 *
 * `sortBy` is an explicit whitelist (`name` | `code` | `createdAt`),
 * matching ListDepartmentsOptions in department.types.ts exactly — an
 * arbitrary string must never reach repository code that could use it to
 * build a Prisma `orderBy`.
 */
export const listDepartmentsQuerySchema = z.object({
  search: z.string().trim().min(1).max(DEPARTMENT_SEARCH_MAX_LENGTH).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(DEPARTMENT_LIST_MAX_PAGE_SIZE)
    .default(DEPARTMENT_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['name', 'code', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListDepartmentsQuery = z.infer<typeof listDepartmentsQuerySchema>;
