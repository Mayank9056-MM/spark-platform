// apps/api/src/modules/rbac/permissions/permission.constants.ts

import type {
  AuthorizationAction,
  AuthorizationResource,
} from '../authorization/authorization.types.js';

/**
 * Canonical, compile-time permission catalog for currently implemented
 * application capabilities.
 *
 * This file defines only WHAT capabilities exist.
 *
 * It does not define:
 * - who receives a permission
 * - which role receives a permission
 * - whether a user is authorized
 * - scope evaluation
 * - audit behavior
 * - database persistence
 *
 * Permissions are global capability definitions. They are not tied to a
 * particular college, department, division, user, or role.
 *
 * Catalog entries should be added only when the corresponding application
 * capability is actually implemented.
 */

/**
 * A single permission catalog entry.
 *
 * The key is derived directly from resource + action, making it impossible
 * for the catalog definition to contain a mismatched manually-authored key.
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

/**
 * Creates a strongly typed permission catalog entry.
 *
 * The returned object is frozen so permission definitions cannot be mutated
 * at runtime after module initialization.
 */
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
 * Canonical permission catalog.
 *
 * Permission identity is security-sensitive because persisted
 * RolePermission records reference permissions by their database identity.
 *
 * `as const` preserves literal types while `Object.freeze` prevents runtime
 * mutation.
 */
export const PERMISSIONS = Object.freeze({
  USER_CREATE: definePermission(
    'user',
    'create',
    'Create User',
    'Allows creating a new user account.',
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

/**
 * Names of entries in the permission catalog.
 */
export type PermissionConstantName = keyof typeof PERMISSIONS;

/**
 * Union of all permission catalog entry values.
 */
export type PermissionCatalogValue = (typeof PERMISSIONS)[PermissionConstantName];

/**
 * Union of all permission keys currently defined in the catalog.
 *
 * Example:
 *
 *   'user:create'
 *   'user:read'
 *   'user:update'
 */
export type CatalogPermissionKey = PermissionCatalogValue['key'];

/**
 * Flat catalog representation.
 *
 * Primarily intended for seed/bootstrap code that needs to iterate over
 * every known permission and upsert it into the database.
 */
export const PERMISSION_CATALOG: readonly PermissionCatalogValue[] = Object.freeze(
  Object.values(PERMISSIONS),
);

/**
 * Lookup map for resolving a known catalog permission key to its definition.
 *
 * This is useful for tests, seed logic, configuration, and other internal
 * code that needs metadata for a statically known permission.
 */
export const PERMISSIONS_BY_KEY: ReadonlyMap<CatalogPermissionKey, PermissionCatalogValue> =
  new Map(PERMISSION_CATALOG.map((permission) => [permission.key, permission]));
