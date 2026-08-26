// apps/api/src/modules/rbac/assignments/role-assignment.types.ts

import type { ScopeContext, UserId } from '../authorization/authorization.types.js';
import type { RoleId } from '../roles/role.types.js';

/**
 * A RoleAssignment connects one User to one Role, within this
 * single-college deployment, with an optional narrower scope and a
 * validity window. It answers "which role is assigned to which user,
 * with what scope and lifecycle" — never "is this assignment currently
 * authorizing anything" (authorization.service.ts / permission-resolver.ts)
 * and never "what permissions does the role grant" (Role/RolePermission,
 * a separate concern — see permission.types.ts's own note that User →
 * Permission is never a direct relationship; it is always User →
 * RoleAssignment → Role → RolePermission → Permission).
 *
 * Modeled directly from the Prisma `RoleAssignment` model
 * (packages/database/prisma/schema.prisma):
 *
 *   id              String    @id @default(uuid())
 *   userId          String
 *   roleId          String
 *   scopeType       ScopeType
 *   scopeId         String?
 *   validFrom       DateTime  @default(now())
 *   validUntil      DateTime?
 *   grantedByUserId String?
 *   createdAt       DateTime  @default(now())
 *   updatedAt       DateTime  @updatedAt
 *
 * No `deletedAt` exists on this model — unlike Role/User, a
 * RoleAssignment is not soft-deleted. Its lifecycle is expressed
 * entirely through `validFrom`/`validUntil`: revoking access means
 * setting `validUntil`, not deleting the row. This file therefore does
 * NOT define an "update" input beyond that — see the note above
 * ListRoleAssignmentsFilters below for how revocation is expected to be
 * expressed at the service boundary instead of via a
 * RevokeRoleAssignmentInput wrapper.
 *
 * No `isSystemDefined` here — that flag belongs to Role
 * (role.types.ts's RoleDTO), not to the join between a user and a role.
 */

// ─────────────────────────────────────────────────────────────────────────
// Identity
// ─────────────────────────────────────────────────────────────────────────

/**
 * The Prisma model has a real surrogate `id` column (not a composite
 * primary key) — so, unlike a pure join table, a standalone
 * RoleAssignmentId is legitimate to model here, not invented.
 */
export type RoleAssignmentId = string;

// ─────────────────────────────────────────────────────────────────────────
// Scope
// ─────────────────────────────────────────────────────────────────────────

/**
 * The Prisma model stores scope as a flat `scopeType` (the `ScopeType`
 * enum: COLLEGE | DEPARTMENT | DIVISION) plus a polymorphic, nullable
 * `scopeId` — the schema's own comment on RoleAssignment notes Postgres
 * cannot enforce which parent table `scopeId` points into, so that
 * agreement is a service-layer responsibility, not something this type
 * file can encode.
 *
 * `authorization.types.ts` already defines a discriminated-union
 * `ScopeContext` for exactly this COLLEGE | DEPARTMENT | DIVISION shape
 * (with `departmentId`/`divisionId` narrowed per variant instead of a
 * bare polymorphic `scopeId`). Reusing it here — rather than redefining
 * an equivalent union, or exposing the raw `scopeType`/`scopeId` pair as
 * domain-facing fields — means a RoleAssignment's scope is expressed in
 * exactly the same shape the authorization engine already consumes, with
 * no separate translation type in between.
 *
 * Converting between this `ScopeContext` shape and the persisted flat
 * `scopeType`/`scopeId` columns is role-assignment.mapper.ts's job, not
 * this file's — this file only declares that a RoleAssignment's domain
 * scope IS a `ScopeContext`, wherever it appears (creation input, DTO).
 *
 * No new scope type/value is introduced — COLLEGE, DEPARTMENT, and
 * DIVISION are exactly what both the Prisma `ScopeType` enum and the
 * existing `ScopeContext` union already define. There is no tenant
 * boundary above COLLEGE: COLLEGE is the top of this hierarchy, not a
 * stand-in for an organization.
 */

/**
 * The flat scope discriminant, derived from `ScopeContext` itself
 * (rather than redeclared as a parallel string-literal union) — used
 * only where a flat, id-less discriminant is genuinely needed (list
 * filtering; see below), not as a replacement for `ScopeContext`
 * elsewhere.
 */
export type RoleAssignmentScopeType = ScopeContext['type'];

// ─────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────

/**
 * Persistence/API-independent representation of a RoleAssignment.
 * Deliberately flat with respect to its user/role references — `userId`
 * and `roleId` only, not a nested `UserProfileDTO`/`RoleDTO`. Nothing in
 * the existing API contract (there is no role-assignment controller/
 * routes yet) establishes a need for an enriched, nested representation.
 * If one is needed later, the established project convention is an
 * additive, explicitly-named extension — exactly how
 * `RoleWithPermissionsDTO` extends `RoleDTO` in role.types.ts — rather
 * than baking nested DTOs into this base shape speculatively.
 *
 * Timestamps are ISO strings, matching RoleDTO/PermissionDTO/
 * UserProfileDTO's existing convention (mapper layers convert Prisma
 * `Date` → `string` on the way out; this file never imports Prisma
 * types to represent it as `Date` directly — see the file-level "no
 * Prisma dependency" constraint).
 */
export interface RoleAssignmentDTO {
  readonly id: RoleAssignmentId;
  readonly userId: UserId;
  readonly roleId: RoleId;
  readonly scope: ScopeContext;
  readonly validFrom: string;
  readonly validUntil: string | null;
  /**
   * Nullable on the Prisma model (`grantedByUserId String?`) — a
   * RoleAssignment can exist without a recorded granter (e.g. seed/
   * bootstrap provisioning), so this stays optional-nullable rather than
   * required.
   */
  readonly grantedByUserId: UserId | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * No RoleAssignmentSummaryDTO is defined here. Unlike RoleSummaryDTO/
 * PermissionSummaryDTO — which exist because another DTO (a future
 * RoleAssignmentDTO, in permission.types.ts's own words) genuinely
 * embeds a reduced reference — nothing in the current codebase embeds a
 * reduced RoleAssignment inside another DTO. Adding one now would be
 * speculative. If a concrete embedding need appears later, add it then,
 * following the same minimal-fields pattern as the existing summary
 * DTOs.
 */

// ─────────────────────────────────────────────────────────────────────────
// Create input
// ─────────────────────────────────────────────────────────────────────────

/**
 * Excludes `grantedByUserId`. This is a real, persisted domain field
 * (not audit-log metadata) but its value is exactly "who is performing
 * this grant" — the same actor identity every other RBAC mutation
 * (`permissionService.assignToRole`, `roleService.createRole`) already
 * receives as a separate trusted `actorUserId` parameter, never as
 * caller-supplied input data. Treating it as service-context-derived
 * here, rather than duplicating it inside the input object, keeps that
 * convention consistent. The intended call shape is
 * `roleAssignmentService.assignRole(actorUserId, input)`.
 *
 * Also excludes `id`/`createdAt`/`updatedAt` — server-generated, same as
 * every other Create*Input in this codebase.
 *
 * `scope` is required, not optional: the Prisma model's `scopeType`
 * column has no default and is non-nullable, so every assignment must
 * declare an explicit scope (including the college-wide case, which
 * `ScopeContext` already represents as `{ type: 'COLLEGE' }` with no id)
 * — there is no server-side default to omit it in favor of.
 *
 * `validFrom`/`validUntil` are modeled as real `Date` values (not ISO
 * strings) since this is the service/domain-layer input contract, not
 * the HTTP boundary — role-assignment.validation.ts is responsible for
 * parsing request input into `Date`s before this type is ever
 * constructed, matching how repository writes take a Date directly.
 * `validFrom` stays optional since the Prisma column defaults to
 * `now()`; nothing currently confirms whether the service is expected
 * to allow backdating/scheduling a future-effective assignment via this
 * field versus always relying on the database default — left optional
 * as the smallest production-safe choice, flagged in the report.
 */
export interface CreateRoleAssignmentInput {
  readonly userId: UserId;
  readonly roleId: RoleId;
  readonly scope: ScopeContext;
  readonly validFrom?: Date;
  readonly validUntil?: Date;
}

/**
 * No RevokeRoleAssignmentInput wrapper is defined here. Revocation on
 * this model means setting `validUntil` on an existing, immutable-
 * otherwise record — there is no second business-data field a revoke
 * operation needs beyond identifying which assignment to revoke and
 * (optionally) the effective revocation instant, which the service can
 * default to "now" the same way `roleService.archiveRole(actorUserId,
 * roleId)` takes no input object at all, just explicit scalar
 * parameters. Introducing a single-purpose wrapper type here would be
 * exactly the "unnecessary wrapper" this task's instructions warn
 * against; the expected call shape is
 * `roleAssignmentService.revokeRoleAssignment(actorUserId,
 * roleAssignmentId)`, mirroring `archiveRole`'s signature shape exactly.
 */

// ─────────────────────────────────────────────────────────────────────────
// List filters / options / result
// ─────────────────────────────────────────────────────────────────────────

/**
 * `activeOnly` is not a literal database column — it is a computed
 * filter over `validUntil` (an assignment is "active" when
 * `validUntil` is null or in the future). It is included because the
 * task's own filter checklist names "active/revoked state" as a
 * candidate, and the model's validFrom/validUntil pair makes that
 * concept real and answerable — but no repository file exists yet to
 * confirm this exact name/shape is what the query layer expects. Flagged
 * as an assumption in the report; the repository is free to implement it
 * as a `WHERE validUntil IS NULL OR validUntil > now()` clause.
 */
export interface ListRoleAssignmentsFilters {
  readonly userId?: UserId;
  readonly roleId?: RoleId;
  readonly scopeType?: RoleAssignmentScopeType;
  readonly scopeId?: string;
  readonly activeOnly?: boolean;
}

/**
 * Same naming/shape convention as `ListRolesOptions`/`ListUsersOptions`.
 * `sortBy` is limited to the two timestamp fields that are meaningful to
 * order a RoleAssignment list by — `createdAt` (when the record was
 * written) and `validFrom` (when the grant takes/took effect) — mirroring
 * how `ListRolesOptions`/`ListPermissionsOptions` restrict `sortBy` to a
 * small, deliberately curated set of columns rather than every column on
 * the model.
 */
export interface ListRoleAssignmentsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'createdAt' | 'validFrom';
  readonly sortOrder: 'asc' | 'desc';
}

/**
 * DTO-facing result type, matching role.types.ts's `ListRolesResult` /
 * permission.types.ts's `ListPermissionsResult` convention — both
 * sibling files in this same `rbac/` tree return DTO-shaped list
 * results, not raw Prisma records. This intentionally does NOT follow
 * user.types.ts's `ListUsersResult`, which returns raw `User[]`
 * (Prisma's own type) rather than `UserProfileDTO[]` — that is a
 * pre-existing inconsistency between the `user` module and the `rbac`
 * module's own DTO-boundary convention, not something this file should
 * silently replicate. Reported separately below; not fixed here.
 */
export interface ListRoleAssignmentsResult {
  readonly roleAssignments: RoleAssignmentDTO[];
  readonly total: number;
}
