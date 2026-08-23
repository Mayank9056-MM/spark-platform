// apps/api/src/modules/rbac/roles/role.validation.ts

import { z } from 'zod';

/**
 * HTTP-boundary validation for the Role module. Answers only "is this
 * HTTP input structurally valid?" — never whether a role/permission
 * exists, whether the caller is authorized, or whether a role is
 * system-defined. Those are role.service.ts / authorization.service.ts /
 * the repository layer's responsibility, not this file's.
 *
 * role.types.ts remains the domain contract (CreateRoleInput,
 * UpdateRoleInput, ListRolesFilters, ListRolesOptions, ...). This file
 * does not duplicate those types — it defines the narrower HTTP input
 * shapes and exports its own inferred types, matching the
 * auth.validation.ts / user.validation.ts convention
 * (`export const xBodySchema = ...; export type XBody = z.infer<...>`).
 *
 * ── TENANT SAFETY ──────────────────────────────────────────────────
 * organizationId is trusted server-side context, resolved from the
 * authenticated request (see role.service.ts — every method takes
 * `organizationId` as an explicit parameter separate from the DTO/input
 * object; CreateRoleInput/UpdateRoleInput in role.types.ts have no
 * organizationId field at all, by design). None of the schemas below
 * accept organizationId from the request body/query/params. A caller
 * must never be able to select another tenant by submitting a different
 * organizationId — so it is never exposed here as user-controlled input.
 *
 * ── ROUTE-STRUCTURE ASSUMPTION (flagged, not invented silently) ─────
 * role.routes.ts / role.controller.ts / rbac.routes.ts / rbac.controller.ts
 * / rbac.validation.ts are all currently empty — no role or
 * grant/revoke-permission routes exist yet in this codebase. The schemas
 * below assume:
 *   - Standard collection/resource routes for roles themselves:
 *     GET/POST /roles, GET/PATCH/DELETE /roles/:id
 *   - Params-only grant/revoke routes, with NO request body:
 *     POST   /roles/:roleId/permissions/:permissionId
 *     DELETE /roles/:roleId/permissions/:permissionId
 *     This mirrors auth.validation.ts's `revokeSessionParamsSchema`
 *     (a params-only UUID schema) and matches role.service.ts's
 *     `grantPermissionToRole(actorUserId, organizationId, roleId,
 *     permissionId)` / `revokePermissionFromRole(...)` signatures exactly
 *     — no separate body payload is needed to satisfy that contract.
 *     A `{ permissionId }`-in-body design for the grant route is an
 *     equally valid alternative reading of the (nonexistent) route
 *     structure; this was a genuine design choice, not a discovered
 *     fact. See the accompanying report.
 *
 * ── PAGINATION DEFAULTS ──────────────────────────────────────────────
 * rbac.constants.ts is empty — no role-specific page-size constants
 * exist. Rather than importing USER_CONSTANTS from the `user` module
 * (a cross-module coupling nothing else in this codebase does) or
 * inventing different arbitrary numbers, the literal defaults below
 * (page size 20, max 100) match user.validation.ts's
 * listUsersQuerySchema exactly, so API clients see consistent pagination
 * behavior across list endpoints.
 */

// ─────────────────────────────────────────────────────────────────────────
// Role key
// ─────────────────────────────────────────────────────────────────────────

/**
 * A role key is a stable, machine-readable identifier, unique per
 * (organizationId, key) — see role.types.ts's RoleDTO doc comment.
 * Unlike email (normalizeEmail), nothing in the existing codebase
 * normalizes role keys, so this schema does not silently lowercase or
 * rewrite the input; it validates against a conservative character
 * policy instead and rejects anything that doesn't already conform.
 *
 * Policy: lowercase ASCII letters, digits, hyphen, underscore, colon —
 * colon is included since Permission.key already uses the same
 * `resource:action` convention (permission.repository.ts) and role keys
 * may reasonably want a similar namespaced style (e.g. "dept:hod").
 * Must start and end with an alphanumeric character, so a key can never
 * be whitespace-only, empty, or edge-punctuated.
 */
const ROLE_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9_:-]*[a-z0-9])?$/;
const ROLE_KEY_MAX_LENGTH = 100;

const roleKeySchema = z
  .string()
  .trim()
  .min(1, 'Role key is required')
  .max(ROLE_KEY_MAX_LENGTH, `Role key must be at most ${ROLE_KEY_MAX_LENGTH} characters`)
  .regex(
    ROLE_KEY_PATTERN,
    'Role key must be lowercase letters, digits, hyphens, underscores, or colons, and must start and end with a letter or digit',
  );

// ─────────────────────────────────────────────────────────────────────────
// Display name
// ─────────────────────────────────────────────────────────────────────────

const ROLE_DISPLAY_NAME_MAX_LENGTH = 150;

const roleDisplayNameSchema = z
  .string()
  .trim()
  .min(1, 'Display name is required')
  .max(
    ROLE_DISPLAY_NAME_MAX_LENGTH,
    `Display name must be at most ${ROLE_DISPLAY_NAME_MAX_LENGTH} characters`,
  );

// ─────────────────────────────────────────────────────────────────────────
// Create role
// ─────────────────────────────────────────────────────────────────────────

/**
 * Deliberately excludes organizationId (trusted server context — see
 * file-level note) and isSystemDefined (server/seed-controlled; see
 * role.types.ts's CreateRoleInput doc comment — a caller must never be
 * able to manufacture a protected role).
 */
export const createRoleBodySchema = z.object({
  key: roleKeySchema,
  displayName: roleDisplayNameSchema,
});
export type CreateRoleBody = z.infer<typeof createRoleBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Update role
// ─────────────────────────────────────────────────────────────────────────

/**
 * Only displayName is mutable at the HTTP boundary — matches
 * UpdateRoleInput exactly. key, organizationId, isSystemDefined, and
 * deletedAt are intentionally never exposed here; they are immutable or
 * server-controlled (see role.types.ts / role.repository.ts).
 *
 * Rejects an empty body via `.refine`, mirroring user.validation.ts's
 * updateUserBodySchema exactly: a PATCH with no fields is not a
 * meaningful request, and letting it through would mean the controller
 * silently no-ops rather than the validation layer catching a client
 * mistake early.
 */
export const updateRoleBodySchema = z
  .object({
    displayName: roleDisplayNameSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateRoleBody = z.infer<typeof updateRoleBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Role ID params
// ─────────────────────────────────────────────────────────────────────────

export const roleIdParamsSchema = z.object({
  id: z.uuid(),
});
export type RoleIdParams = z.infer<typeof roleIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List roles query
// ─────────────────────────────────────────────────────────────────────────

const ROLE_LIST_DEFAULT_PAGE_SIZE = 20;
const ROLE_LIST_MAX_PAGE_SIZE = 100;
const ROLE_SEARCH_MAX_LENGTH = 200;

/**
 * HTTP query parameters arrive as strings (Express does not parse
 * "true"/"false" into booleans). z.coerce.boolean() is deliberately NOT
 * used here: `Boolean("false")` evaluates to `true`, so coercing that
 * way would silently misinterpret the literal query string
 * `isSystemDefined=false` as `true` — a real correctness bug, not a
 * style preference. Instead, only the two literal string values are
 * accepted and explicitly mapped to their boolean meaning; anything else
 * fails validation with a clear message rather than being coerced.
 */
const queryBooleanSchema = z.enum(['true', 'false']).transform((value) => value === 'true');

export const listRolesQuerySchema = z.object({
  search: z.string().trim().min(1).max(ROLE_SEARCH_MAX_LENGTH).optional(),
  isSystemDefined: queryBooleanSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ROLE_LIST_MAX_PAGE_SIZE)
    .default(ROLE_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['key', 'displayName', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListRolesQuery = z.infer<typeof listRolesQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Grant / revoke permission
// ─────────────────────────────────────────────────────────────────────────

/**
 * Params-only — see the file-level "ROUTE-STRUCTURE ASSUMPTION" note.
 * No organizationId or actorUserId here: both must come from trusted
 * authentication/context (req.user), never from the request itself.
 */
export const grantPermissionToRoleParamsSchema = z.object({
  roleId: z.uuid(),
  permissionId: z.uuid(),
});
export type GrantPermissionToRoleParams = z.infer<typeof grantPermissionToRoleParamsSchema>;

/** Same shape as grant — kept as a distinct export so the two endpoints' validation can diverge independently if the route design changes later. */
export const revokePermissionFromRoleParamsSchema = z.object({
  roleId: z.uuid(),
  permissionId: z.uuid(),
});
export type RevokePermissionFromRoleParams = z.infer<typeof revokePermissionFromRoleParamsSchema>;
