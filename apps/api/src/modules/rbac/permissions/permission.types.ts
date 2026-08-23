// apps/api/src/modules/rbac/permissions/permission.types.ts

import type {
  AuthorizationAction,
  AuthorizationResource,
  PermissionIdentity,
  PermissionKey,
} from '../authorization/authorization.types.js';

/**
 * A Permission is a capability definition — not a role, not a grant, not
 * an authorization decision. It answers "what does this key allow",
 * never "who has it" (RoleAssignment/Role) or "is this allowed right now"
 * (the authorization engine).
 *
 * Permission is deliberately NOT organization-scoped, matching the
 * schema: the permission catalog is global across tenants. Only which
 * permissions a Role holds, and which Role a User holds, is tenant-scoped.
 * Do not add an organizationId here.
 */

export type PermissionId = string;

/**
 * Full persisted shape, as the repository/mapper exposes it. `key` is
 * re-typed as the branded `PermissionKey` rather than `string` on the way
 * out of the mapper — every stored Permission is expected to correspond
 * to a resource:action pair even though the DB column itself is an
 * unconstrained unique string.
 */
export interface PermissionDTO {
  readonly id: PermissionId;
  readonly key: PermissionKey;
  readonly displayName: string;
  readonly description: string;
  readonly createdAt: string;
}

/** Minimal shape for embedding a permission reference inside another DTO (e.g. a future RoleDTO's permission list) without re-fetching the full record. */
export interface PermissionSummaryDTO {
  readonly id: PermissionId;
  readonly key: PermissionKey;
  readonly displayName: string;
}

/**
 * Input for creating/seeding a Permission. Callers supply the structured
 * identity (resource + action) via `PermissionIdentity`, not a raw key
 * string — this keeps every created permission provably aligned with
 * `AuthorizationResource`/`AuthorizationAction` rather than letting an
 * arbitrary key string drift from the authorization contract.
 */
export interface CreatePermissionInput extends PermissionIdentity {
  readonly displayName: string;
  readonly description: string;
}

/**
 * `key` — and by extension resource/action — is intentionally not
 * editable: a Permission's identity is the capability it represents.
 * Changing it after `RolePermission` rows reference it would silently
 * reassign what those roles already grant. Only descriptive metadata
 * may change.
 */
export interface UpdatePermissionInput {
  readonly displayName?: string;
  readonly description?: string;
}

export interface ListPermissionsFilters {
  readonly resource?: AuthorizationResource;
  readonly action?: AuthorizationAction;
  readonly search?: string;
}

export interface ListPermissionsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'key' | 'displayName' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListPermissionsResult {
  /**
   * Service/API-facing contract, not the repository's return shape.
   * permission.repository.ts returns raw Prisma `Permission[]` (see its
   * own `PermissionListQueryResult`); this type is what permission.service.ts
   * produces after mapping those rows to `PermissionDTO`. The two are
   * deliberately distinct types, not duplicates — repository stays
   * Prisma-shaped, this stays DTO-shaped, per the project's
   * Repository → Service → Mapper → DTO convention.
   */
  readonly permissions: PermissionDTO[];
  readonly total: number;
}

/**
 * Domain representation of a RolePermission row — the grant of one
 * Permission to one Role. Deliberately excludes any User/RoleAssignment
 * concept: this describes what a Role holds, not who holds the Role.
 * `roleId` stays a bare string (not a branded RoleId) since role.types.ts
 * doesn't exist yet — reconcile this once it does, rather than this file
 * inventing that type first.
 */
export interface RolePermissionLink {
  readonly roleId: string;
  readonly permissionId: PermissionId;
  readonly createdAt: string;
}

/** Grant/revoke input for RBAC administration. */
export interface AssignPermissionToRoleInput {
  readonly roleId: string;
  readonly permissionId: PermissionId;
}

/**
 * Bulk-lookup input for the permission resolver: given a subject's
 * effective role IDs, fetch every permission those roles grant. This is
 * the shape permission-resolver.ts consumes to turn "roles" into
 * "permissions" en route to an `AuthorizationDecision`.
 */
export interface ResolvePermissionsForRolesInput {
  readonly roleIds: readonly string[];
}
