// apps/api/src/modules/rbac/permissions/permission.constants.ts

import type {
  AuthorizationAction,
  AuthorizationResource,
} from '../authorization/authorization.types.js';

/**
 * Canonical, compile-time permission catalog for currently implemented
 * SPARK capabilities. This file defines the capability layer only — "what
 * exists" — never "who has it." No RoleAssignment/Role/User/authorization-
 * decision concepts belong here.
 *
 * Catalog growth must track actual module implementation: a resource only
 * appears here once its module has a real, routed capability, not because
 * `AuthorizationResource` already names it for future use.
 */

/**
 * One catalog entry. `key` is a literal type derived from `resource` and
 * `action` via `definePermission` below — it is structurally impossible
 * to construct an entry where `key !== `${resource}:${action}``, because
 * nothing ever assigns `key` by hand.
 */
export interface PermissionCatalogEntry<
  R extends AuthorizationResource = AuthorizationResource,
  A extends AuthorizationAction = AuthorizationAction,
> {
  readonly resource: R;
  readonly action: A;
  readonly key: `${R}:${A}`;
  readonly displayName: string;
  readonly description: string;
}

function definePermission<R extends AuthorizationResource, A extends AuthorizationAction>(
  resource: R,
  action: A,
  displayName: string,
  description: string,
): PermissionCatalogEntry<R, A> {
  return Object.freeze({
    resource,
    action,
    key: `${resource}:${action}`,
    displayName,
    description,
  });
}

/**
 * The canonical catalog. Frozen at both the type level (`as const`) and
 * runtime (`Object.freeze`) — a permission's identity is security-
 * sensitive, and existing RolePermission rows may already reference a
 * given key by the time this module is edited again.
 */
export const PERMISSIONS = Object.freeze({
  USER_CREATE: definePermission(
    'user',
    'create',
    'Create User',
    'Allows creating a new user account within the organization.',
  ),
  USER_READ: definePermission('user', 'read', 'Read User', 'Allows viewing a user profile.'),
  USER_UPDATE: definePermission('user', 'update', 'Update User', 'Allows updating a user profile.'),
  USER_ARCHIVE: definePermission(
    'user',
    'archive',
    'Archive User',
    'Allows archiving a user account.',
  ),
  USER_RESTORE: definePermission(
    'user',
    'restore',
    'Restore User',
    'Allows restoring a previously archived user account.',
  ),
} as const satisfies Record<string, PermissionCatalogEntry>);

export type PermissionConstantName = keyof typeof PERMISSIONS;
export type PermissionCatalogValue = (typeof PERMISSIONS)[PermissionConstantName];
export type CatalogPermissionKey = PermissionCatalogValue['key'];

/** Flat array form — for seed scripts to iterate and upsert by key. */
export const PERMISSION_CATALOG: readonly PermissionCatalogValue[] = Object.freeze(
  Object.values(PERMISSIONS),
);

/** Lookup form — for tests/config to resolve a known key to its definition. */
export const PERMISSIONS_BY_KEY: ReadonlyMap<CatalogPermissionKey, PermissionCatalogValue> =
  new Map(PERMISSION_CATALOG.map((permission) => [permission.key, permission]));
