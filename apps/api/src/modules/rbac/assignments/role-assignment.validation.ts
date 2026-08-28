// apps/api/src/modules/rbac/assignments/role-assignment.validation.ts

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────
// Scope
// ─────────────────────────────────────────────────────────────────────────

const SCOPE_TYPES = ['COLLEGE', 'DEPARTMENT'] as const;

const scopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('COLLEGE') }),
  z.object({ type: z.literal('DEPARTMENT'), departmentId: z.uuid() }),
]);

// ─────────────────────────────────────────────────────────────────────────
// Create role assignment
// ─────────────────────────────────────────────────────────────────────────

export const createRoleAssignmentBodySchema = z.object({
  userId: z.uuid(),
  roleId: z.uuid(),
  scope: scopeSchema,
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
});
export type CreateRoleAssignmentBody = z.infer<typeof createRoleAssignmentBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Role assignment ID params
// ─────────────────────────────────────────────────────────────────────────

/** For generic single-resource routes (e.g. GET /role-assignments/:id), matching role.validation.ts's own `roleIdParamsSchema { id }` convention. */
export const roleAssignmentIdParamsSchema = z.object({
  id: z.uuid(),
});
export type RoleAssignmentIdParams = z.infer<typeof roleAssignmentIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// Revoke
// ─────────────────────────────────────────────────────────────────────────

export const revokeRoleAssignmentParamsSchema = z.object({
  roleAssignmentId: z.uuid(),
});
export type RevokeRoleAssignmentParams = z.infer<typeof revokeRoleAssignmentParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List role assignments query
// ─────────────────────────────────────────────────────────────────────────

const ROLE_ASSIGNMENT_LIST_DEFAULT_PAGE_SIZE = 20;
const ROLE_ASSIGNMENT_LIST_MAX_PAGE_SIZE = 100;

/**
 * Same non-`z.coerce.boolean()` reasoning as `role.validation.ts`'s own
 * `isSystemDefined` query handling: `Boolean("false")` is `true`, so
 * coercing that way would silently misinterpret the literal query string
 * `activeOnly=false` as `true`. Only the two literal string values are
 * accepted and explicitly mapped. (This is the same idiom as
 * role.validation.ts's private `queryBooleanSchema` — redefined locally
 * here rather than imported, since that constant isn't exported and each
 * validation file in this codebase is self-contained.)
 */
const queryBooleanSchema = z.enum(['true', 'false']).transform((value) => value === 'true');

export const listRoleAssignmentsQuerySchema = z.object({
  userId: z.uuid().optional(),
  roleId: z.uuid().optional(),
  scopeType: z.enum(SCOPE_TYPES).optional(),
  scopeId: z.uuid().optional(),
  activeOnly: queryBooleanSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ROLE_ASSIGNMENT_LIST_MAX_PAGE_SIZE)
    .default(ROLE_ASSIGNMENT_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['createdAt', 'validFrom']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListRoleAssignmentsQuery = z.infer<typeof listRoleAssignmentsQuerySchema>;
