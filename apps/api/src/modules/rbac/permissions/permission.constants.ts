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
  ROLE_CREATE: definePermission('role', 'create', 'Create Role', 'Allows creating a new role.'),
  ROLE_READ: definePermission(
    'role',
    'read',
    'Read Role',
    'Allows viewing role definitions and their granted permissions.',
  ),
  ROLE_UPDATE: definePermission(
    'role',
    'update',
    'Update Role',
    "Allows updating a role's display name and its granted permissions.",
  ),
  ROLE_ARCHIVE: definePermission(
    'role',
    'archive',
    'Archive Role',
    'Allows archiving a non-system role.',
  ),
  ROLE_RESTORE: definePermission(
    'role',
    'restore',
    'Restore Role',
    'Allows restoring a previously archived role.',
  ),

  PERMISSION_CREATE: definePermission(
    'permission',
    'create',
    'Create Permission',
    'Allows creating a new permission catalog entry.',
  ),
  PERMISSION_READ: definePermission(
    'permission',
    'read',
    'Read Permission',
    'Allows viewing the permission catalog.',
  ),
  PERMISSION_UPDATE: definePermission(
    'permission',
    'update',
    'Update Permission',
    "Allows updating a permission's display metadata.",
  ),

  ROLE_ASSIGNMENT_CREATE: definePermission(
    'roleAssignment',
    'create',
    'Create Role Assignment',
    'Allows assigning a role to a user within a scope.',
  ),
  ROLE_ASSIGNMENT_READ: definePermission(
    'roleAssignment',
    'read',
    'Read Role Assignment',
    'Allows viewing role assignments.',
  ),
  ROLE_ASSIGNMENT_DELETE: definePermission(
    'roleAssignment',
    'delete',
    'Revoke Role Assignment',
    'Allows revoking an active role assignment.',
  ),
  DEPARTMENT_CREATE: definePermission(
    'department',
    'create',
    'Create Department',
    'Allows creating a new department.',
  ),
  DEPARTMENT_READ: definePermission(
    'department',
    'read',
    'Read Department',
    'Allows viewing department details.',
  ),
  DEPARTMENT_UPDATE: definePermission(
    'department',
    'update',
    'Update Department',
    "Allows updating a department's details.",
  ),
  DEPARTMENT_DELETE: definePermission(
    'department',
    'delete',
    'Delete Department',
    'Allows deleting a department.',
  ),
  PROGRAM_CREATE: definePermission(
    'program',
    'create',
    'Create Program',
    'Allows creating a new academic program.',
  ),
  PROGRAM_READ: definePermission(
    'program',
    'read',
    'Read Program',
    'Allows viewing academic program details.',
  ),
  PROGRAM_UPDATE: definePermission(
    'program',
    'update',
    'Update Program',
    "Allows updating an academic program's details.",
  ),
  PROGRAM_DELETE: definePermission(
    'program',
    'delete',
    'Delete Program',
    'Allows deleting an academic program.',
  ),
  SEMESTER_CATALOG_CREATE: definePermission(
    'semesterCatalog',
    'create',
    'Create Semester Catalog',
    'Allows creating a new semester catalog entry.',
  ),
  SEMESTER_CATALOG_READ: definePermission(
    'semesterCatalog',
    'read',
    'Read Semester Catalog',
    'Allows viewing semester catalog details.',
  ),
  SEMESTER_CATALOG_UPDATE: definePermission(
    'semesterCatalog',
    'update',
    'Update Semester Catalog',
    "Allows updating a semester catalog entry's details.",
  ),
  SEMESTER_CATALOG_DELETE: definePermission(
    'semesterCatalog',
    'delete',
    'Delete Semester Catalog',
    'Allows deleting a semester catalog entry.',
  ),
  SUBJECT_CREATE: definePermission(
    'subject',
    'create',
    'Create Subject',
    'Allows creating a new subject.',
  ),
  SUBJECT_READ: definePermission(
    'subject',
    'read',
    'Read Subject',
    'Allows viewing subject details.',
  ),
  SUBJECT_UPDATE: definePermission(
    'subject',
    'update',
    'Update Subject',
    "Allows updating a subject's details.",
  ),
  SUBJECT_DELETE: definePermission(
    'subject',
    'delete',
    'Delete Subject',
    'Allows deleting a subject.',
  ),
  ELECTIVE_GROUP_CREATE: definePermission(
    'electiveGroup',
    'create',
    'Create Elective Group',
    'Allows creating a new elective group.',
  ),
  ELECTIVE_GROUP_READ: definePermission(
    'electiveGroup',
    'read',
    'Read Elective Group',
    'Allows viewing elective group details.',
  ),
  ELECTIVE_GROUP_UPDATE: definePermission(
    'electiveGroup',
    'update',
    'Update Elective Group',
    "Allows updating an elective group's details.",
  ),
  ELECTIVE_GROUP_DELETE: definePermission(
    'electiveGroup',
    'delete',
    'Delete Elective Group',
    'Allows deleting an elective group.',
  ),
  CURRICULUM_VERSION_CREATE: definePermission(
    'curriculumVersion',
    'create',
    'Create Curriculum Version',
    'Allows creating a new curriculum version.',
  ),
  CURRICULUM_VERSION_READ: definePermission(
    'curriculumVersion',
    'read',
    'Read Curriculum Version',
    'Allows viewing curriculum version details.',
  ),
  CURRICULUM_VERSION_UPDATE: definePermission(
    'curriculumVersion',
    'update',
    'Update Curriculum Version',
    "Allows updating a curriculum version's details.",
  ),
  CURRICULUM_VERSION_DELETE: definePermission(
    'curriculumVersion',
    'delete',
    'Delete Curriculum Version',
    'Allows deleting a curriculum version.',
  ),
  ACADEMIC_YEAR_CREATE: definePermission(
    'academicYear',
    'create',
    'Create Academic Year',
    'Allows creating a new academic year.',
  ),
  ACADEMIC_YEAR_READ: definePermission(
    'academicYear',
    'read',
    'Read Academic Year',
    'Allows viewing academic year details.',
  ),
  ACADEMIC_YEAR_UPDATE: definePermission(
    'academicYear',
    'update',
    'Update Academic Year',
    "Allows updating an academic year's label or date range.",
  ),
  ACADEMIC_YEAR_DELETE: definePermission(
    'academicYear',
    'delete',
    'Delete Academic Year',
    'Allows deleting an academic year that is inactive and unreferenced.',
  ),
  ACADEMIC_YEAR_ACTIVATE: definePermission(
    'academicYear',
    'activate',
    'Activate Academic Year',
    "Allows making an academic year the college's current active year.",
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
