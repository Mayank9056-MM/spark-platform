// apps/api/src/modules/rbac/assignments/role-assignment.validation.ts

import { z } from 'zod';

/**
 * HTTP-boundary validation for the RoleAssignment module. Answers only
 * "is this HTTP input structurally valid?" — never whether the user/role
 * exist, whether they belong to this organization, whether the scope's
 * department/division exists, whether the assignment already exists, or
 * whether the caller is authorized. Those are role-assignment.service.ts
 * / role.repository.ts / user repository / scope service / authorization
 * .service.ts's responsibility, not this file's.
 *
 * role-assignment.types.ts remains the domain contract
 * (CreateRoleAssignmentInput, ListRoleAssignmentsFilters,
 * ListRoleAssignmentsOptions, ...). This file does not import or
 * redefine those types — it defines its own HTTP-input schemas and
 * infers its own types, matching auth.validation.ts's / user.validation.ts's
 * / role.validation.ts's established pattern of staying self-contained
 * (none of those three files imports its sibling *.types.ts file either).
 * The inferred `CreateRoleAssignmentBody` type is deliberately shaped to
 * be directly compatible with `CreateRoleAssignmentInput` (same field
 * names, same optionality, `Date` — not `string` — for the two date
 * fields) without a formal type-level dependency between the two files.
 *
 * `scope.types.ts` and `scope.constants.ts` (the RBAC `scopes` module)
 * are both currently empty — confirmed, not assumed — so there is no
 * existing scope-specific validation convention or constant to reuse.
 * The scope schema below is built directly from `ScopeContext`'s shape
 * as defined in authorization.types.ts (inspected, not guessed).
 *
 * ── TENANT / ACTOR SAFETY (the most important property of this file) ──
 * Neither `organizationId` nor `grantedByUserId`/`actorUserId` appears in
 * ANY schema below. Both must come from trusted authenticated/server
 * context (`req.user.organizationId`, the authenticated actor's id),
 * matching role.types.ts's own CreateRoleAssignmentInput doc comment and
 * role.validation.ts's established convention for `createRoleBodySchema`.
 * A client must never be able to select another tenant, or attribute a
 * grant to another administrator, by submitting either field in the
 * request body. Every schema here uses plain `z.object({...})` (the
 * project's established non-strict convention — see role.validation.ts's
 * own note that nothing in this codebase uses `.strict()`/`.looseObject()`),
 * which means an extra `organizationId`/`grantedByUserId` field submitted
 * by a client is silently stripped by Zod's `parse()` rather than
 * rejected outright — but critically, it never survives into
 * `result.data`, so it can never reach the service layer through this
 * validation step regardless of strictness mode. This is the same
 * guarantee every other schema in this codebase already relies on.
 */

// ─────────────────────────────────────────────────────────────────────────
// Scope
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors `ScopeContext` (authorization.types.ts) exactly:
 *
 *   type ScopeContext =
 *     | { type: 'ORGANIZATION' }
 *     | { type: 'DEPARTMENT'; departmentId: string }
 *     | { type: 'DIVISION'; divisionId: string };
 *
 * No new scope type is introduced. `z.discriminatedUnion('type', [...])`
 * is used rather than a plain `z.union` — it gives a precise, single
 * error when `type` doesn't match one of the three known literals,
 * instead of Zod's generic "no union member matched" message, and its
 * shape maps directly onto the domain's own discriminated union with no
 * translation step.
 *
 * `departmentId`/`divisionId` are validated as UUIDs — structural
 * validation only ("is this a UUID?"), per this task's explicit
 * instruction. This schema does NOT check that the department/division
 * exists, or that it belongs to the caller's organization — that is
 * role-assignment.service.ts's / the scope resolver's job, which has
 * database access this validation layer deliberately does not.
 *
 * `ORGANIZATION` requires no `departmentId`/`divisionId`/`scopeId` —
 * the organization itself is already known from trusted authentication
 * context; nothing here asks the client to name its own organization.
 */
const SCOPE_TYPES = ['ORGANIZATION', 'DEPARTMENT', 'DIVISION'] as const;

const scopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ORGANIZATION') }),
  z.object({ type: z.literal('DEPARTMENT'), departmentId: z.uuid() }),
  z.object({ type: z.literal('DIVISION'), divisionId: z.uuid() }),
]);

// ─────────────────────────────────────────────────────────────────────────
// Create role assignment
// ─────────────────────────────────────────────────────────────────────────

/**
 * Deliberately excludes `organizationId` and `grantedByUserId` — see the
 * file-level "TENANT / ACTOR SAFETY" note. Matches
 * `CreateRoleAssignmentInput` (role-assignment.types.ts) field-for-field
 * otherwise: `userId`, `roleId`, `scope` (required — the domain type has
 * no default to omit it in favor of), `validFrom`/`validUntil`
 * (optional, matching the domain input's own optionality).
 *
 * `validFrom`/`validUntil` use `z.coerce.date()` rather than a bare
 * `z.string()` later passed to `new Date(value)` unchecked — this is the
 * direct continuation of `role.validation.ts`'s own `z.coerce.number()`
 * idiom for pagination (parse untyped HTTP input into a real typed
 * value, reject anything that doesn't coerce), applied here to `Date`
 * instead of `number`. `z.coerce.date()` rejects malformed/unparseable
 * date input rather than silently producing an `Invalid Date`.
 *
 * No `.refine()` enforcing `validUntil > validFrom` is added. No
 * existing validation file in this codebase uses `.refine()` for a
 * cross-field business/ordering rule (the one existing `.refine()` —
 * `updateUserBodySchema`'s "at least one field must be provided" — is a
 * structural presence check, not a business rule), and this task's own
 * instructions are explicit that RBAC lifecycle policy belongs to
 * role-assignment.service.ts, not this validation layer.
 */
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

/**
 * Params-only — no revoke body schema is created. role-assignment.types.ts's
 * own doc comment on why no `RevokeRoleAssignmentInput` exists applies
 * equally here: revocation needs only the identifier of which assignment
 * to revoke, with `validUntil` defaulted by the service layer (matching
 * `roleService.archiveRole(actorUserId, organizationId, roleId)`'s own
 * no-body-input shape). Nothing here confirms the service actually wants
 * a client-suppliable revocation effective date, and per this task's own
 * instruction not to create a revoke body unless the service actually
 * requires one, none is added.
 *
 * ASSUMPTION (flagged, not a verified fact): the field name is
 * `roleAssignmentId`, not the generic `id` used by
 * `roleAssignmentIdParamsSchema` above. This anchors to
 * `auth.validation.ts`'s `revokeSessionParamsSchema { sessionId: z.uuid()
 * }` — a resource-specific name for a dedicated "revoke this resource"
 * endpoint — rather than to `role.validation.ts`'s generic `{ id }` used
 * for ordinary CRUD routes. Both are genuine, established precedents in
 * this codebase pointing in different directions for a "revoke" action
 * specifically; `revokeSessionParamsSchema` was judged the closer
 * analog since it is the only other *revoke*-shaped endpoint in the
 * codebase, versus `roleIdParamsSchema`, which serves ordinary
 * get/update/archive routes rather than a revoke action. No
 * role-assignment.controller.ts/routes.ts exists yet to confirm this
 * either way.
 */
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

/**
 * Covers exactly the fields `ListRoleAssignmentsFilters`/
 * `ListRoleAssignmentsOptions` (role-assignment.types.ts) define — no
 * more. `organizationId` is deliberately absent (trusted server context,
 * never a query parameter — see the file-level note). No `search` field
 * is added: `ListRoleAssignmentsFilters` defines no such field, and a
 * RoleAssignment is a relationship record with no free-text-searchable
 * content of its own, unlike Role/User/Permission's key/displayName/email
 * fields.
 *
 * `scopeType` reuses the same `SCOPE_TYPES` literal tuple the `scope`
 * object schema's discriminant values are drawn from, so the two never
 * drift independently of each other.
 *
 * Pagination defaults (page size 20, max 100) and `sortOrder` default
 * (`desc`) match `role.validation.ts`'s `listRolesQuerySchema` exactly —
 * per this task's own instruction to follow the closest established
 * RBAC/list convention when no role-assignment-specific constants exist
 * (confirmed: `rbac.constants.ts` and `scope.constants.ts` are both
 * empty), rather than importing a differently-scoped module's constants
 * or inventing new numbers.
 *
 * `sortBy` is restricted to exactly `ListRoleAssignmentsOptions`'s two
 * defined values (`createdAt` | `validFrom`) — no arbitrary client-
 * supplied column name is ever accepted.
 */
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
