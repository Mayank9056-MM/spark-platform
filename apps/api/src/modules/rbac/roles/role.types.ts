// apps/api/src/modules/rbac/roles/role.types.ts

import type { PermissionKey } from '../authorization/authorization.types.js';
import type { PermissionId, PermissionSummaryDTO } from '../permissions/permission.types.js';

/**
 * A Role is a named collection of permissions, global within this
 * single-college deployment. It answers "what permissions does this role
 * grant" — never "who holds this role" (RoleAssignment, a separate
 * module) and never "is this specific request allowed" (the
 * authorization engine).
 *
 * There is no tenant boundary: a Role's identity is its `key` alone.
 *
 * No role hierarchy or inheritance is modeled: the Prisma Role model has
 * no parent-role/inherited-permission concept, so none is invented here.
 */

export type RoleId = string;

/**
 * `key` is a role's stable, globally unique identity. It should be
 * treated as immutable once created: RoleAssignment and RolePermission
 * rows reference a role by id, but external seed/config/integration
 * surfaces commonly reference it by key, and changing it after the fact
 * would silently break those references. `displayName` is the mutable,
 * human-facing label.
 *
 * `isSystemDefined` exists on the Prisma model
 * (`Role.isSystemDefined Boolean @default(false)`) and is included here
 * as a read-side fact. It is deliberately absent from CreateRoleInput/
 * UpdateRoleInput below — see the note on those types.
 */
export interface RoleDTO {
  readonly id: RoleId;
  readonly key: string;
  readonly displayName: string;
  readonly isSystemDefined: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Minimal shape for embedding a role reference inside another DTO (e.g. a future RoleAssignmentDTO) without re-fetching the full record. */
export interface RoleSummaryDTO {
  readonly id: RoleId;
  readonly key: string;
  readonly displayName: string;
}

/**
 * A Role together with the permissions it currently grants. Kept
 * separate from RoleDTO so an ordinary role lookup/list doesn't force
 * loading every granted permission — this represents an explicitly
 * requested, enriched view.
 */
export interface RoleWithPermissionsDTO extends RoleDTO {
  readonly permissions: readonly PermissionSummaryDTO[];
}

/**
 * `isSystemDefined` is excluded — a caller must never be able to submit
 * `isSystemDefined: true` to manufacture a protected role. Only trusted
 * server-side seed logic may set it, at the repository layer
 * (`createSystemRole`).
 */
export interface CreateRoleInput {
  readonly key: string;
  readonly displayName: string;
}

/**
 * Only the mutable display label. `key` (identity) and `isSystemDefined`
 * (server-controlled protection flag) are excluded — changing either
 * after creation is not a legitimate business operation this contract
 * should offer.
 */
export interface UpdateRoleInput {
  readonly displayName?: string;
}

export interface ListRolesFilters {
  readonly search?: string;
  readonly isSystemDefined?: boolean;
}

export interface ListRolesOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'key' | 'displayName' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListRolesResult {
  readonly roles: RoleDTO[];
  readonly total: number;
}

/**
 * Role-facing view of a RolePermission row — deliberately distinct from
 * permission.types.ts's `RolePermissionLink`, not a duplicate of it.
 * `RolePermissionLink` is Permission's own minimal view of the join;
 * this one adds `permissionKey`, which the Role module's own consumers
 * (RBAC administration, audit trails) need without a second lookup. Same
 * composite-key shape otherwise: no surrogate id, matching the schema's
 * `(roleId, permissionId)` primary key.
 */
export interface RolePermissionGrant {
  readonly roleId: RoleId;
  readonly permissionId: PermissionId;
  readonly permissionKey: PermissionKey;
  readonly createdAt: string;
}

export interface GrantPermissionToRoleInput {
  readonly roleId: RoleId;
  readonly permissionId: PermissionId;
}

export interface RevokePermissionFromRoleInput {
  readonly roleId: RoleId;
  readonly permissionId: PermissionId;
}
