// apps/api/src/modules/rbac/permissions/permission.validation.ts

import { z } from 'zod';

/**
 * HTTP-boundary validation for the Permission module — structural only.
 * Mirrors AuthorizationResource/AuthorizationAction (authorization.types.ts)
 * as runtime literal arrays, the same duplication pattern
 * role-assignment.validation.ts already uses for SCOPE_TYPES: a type-only
 * union can't be turned into a z.enum() without a parallel runtime array,
 * and no other file in this codebase exports one.
 */
const AUTHORIZATION_RESOURCES = [
  'user',
  'role',
  'permission',
  'roleAssignment',
  'student',
  'faculty',
  'attendance',
  'assignment',
  'notice',
] as const;

const AUTHORIZATION_ACTIONS = ['create', 'read', 'update', 'delete', 'archive', 'restore'] as const;

const PERMISSION_DISPLAY_NAME_MAX_LENGTH = 150;
const PERMISSION_DESCRIPTION_MAX_LENGTH = 500;
const PERMISSION_SEARCH_MAX_LENGTH = 200;
const PERMISSION_LIST_DEFAULT_PAGE_SIZE = 20;
const PERMISSION_LIST_MAX_PAGE_SIZE = 100;

export const createPermissionBodySchema = z.object({
  resource: z.enum(AUTHORIZATION_RESOURCES),
  action: z.enum(AUTHORIZATION_ACTIONS),
  displayName: z.string().trim().min(1).max(PERMISSION_DISPLAY_NAME_MAX_LENGTH),
  description: z.string().trim().min(1).max(PERMISSION_DESCRIPTION_MAX_LENGTH),
});
export type CreatePermissionBody = z.infer<typeof createPermissionBodySchema>;

/** Only displayName/description are mutable — resource/action define permission identity and are immutable, matching UpdatePermissionInput (permission.types.ts). */
export const updatePermissionBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(PERMISSION_DISPLAY_NAME_MAX_LENGTH).optional(),
    description: z.string().trim().min(1).max(PERMISSION_DESCRIPTION_MAX_LENGTH).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdatePermissionBody = z.infer<typeof updatePermissionBodySchema>;

export const permissionIdParamsSchema = z.object({
  id: z.uuid(),
});
export type PermissionIdParams = z.infer<typeof permissionIdParamsSchema>;

const queryBooleanSchema = z.enum(['true', 'false']).transform((value) => value === 'true');
void queryBooleanSchema; // reserved — no boolean filter currently exists on ListPermissionsFilters

export const listPermissionsQuerySchema = z.object({
  resource: z.enum(AUTHORIZATION_RESOURCES).optional(),
  action: z.enum(AUTHORIZATION_ACTIONS).optional(),
  search: z.string().trim().min(1).max(PERMISSION_SEARCH_MAX_LENGTH).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PERMISSION_LIST_MAX_PAGE_SIZE)
    .default(PERMISSION_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['key', 'displayName', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListPermissionsQuery = z.infer<typeof listPermissionsQuerySchema>;
