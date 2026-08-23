// apps/api/src/modules/rbac/roles/role.mapper.ts

import type { Role } from '@spark/database/client';

import { toPermissionSummaryDTO } from '../permissions/permission.mapper.js';

import type { RoleWithPermissionsRecord } from './role.repository.js';
import type { RoleDTO, RoleSummaryDTO, RoleWithPermissionsDTO } from './role.types.js';

/**
 * Persistence → DTO boundary for the Role domain. This must be the ONLY
 * place a Prisma `Role` row (or the repository's `RoleWithPermissionsRecord`
 * composite) is shaped into `RoleDTO` / `RoleSummaryDTO` /
 * `RoleWithPermissionsDTO` — route every Role-returning endpoint through
 * this file, the same convention `permission.mapper.ts` establishes for
 * `Permission` and `auth.mapper.ts`'s `toPublicUser` establishes for `User`.
 *
 * Deterministic and side-effect free: no Prisma queries, no repository/
 * service calls, no authorization decisions, no audit logging, no
 * mutation of the input record. `organizationId` and `isSystemDefined`
 * are preserved exactly as supplied — this file makes no tenant or
 * system-role policy decisions; those belong to role.service.ts /
 * authorization.service.ts.
 */

export function toRoleDTO(role: Role): RoleDTO {
  return {
    id: role.id,
    organizationId: role.organizationId,
    key: role.key,
    displayName: role.displayName,
    isSystemDefined: role.isSystemDefined,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

/** Maps only the fields RoleSummaryDTO defines — deliberately not a wrapper around toRoleDTO(), to keep the summary lightweight. */
export function toRoleSummaryDTO(role: Role): RoleSummaryDTO {
  return {
    id: role.id,
    organizationId: role.organizationId,
    key: role.key,
    displayName: role.displayName,
  };
}

/**
 * Converts the repository's Role-centric composite read
 * (`RoleWithPermissionsRecord` — Role + rolePermissions + permission) into
 * `RoleWithPermissionsDTO`. Permission mapping is delegated entirely to
 * `toPermissionSummaryDTO` from permission.mapper.ts — no Permission →
 * PermissionSummaryDTO logic is duplicated here. Preserves the order
 * `rolePermissions` is supplied in; does not sort.
 */
export function toRoleWithPermissionsDTO(role: RoleWithPermissionsRecord): RoleWithPermissionsDTO {
  return {
    id: role.id,
    organizationId: role.organizationId,
    key: role.key,
    displayName: role.displayName,
    isSystemDefined: role.isSystemDefined,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
    permissions: role.rolePermissions.map((rolePermission) =>
      toPermissionSummaryDTO(rolePermission.permission),
    ),
  };
}

export function toRoleDTOList(roles: readonly Role[]): RoleDTO[] {
  return roles.map(toRoleDTO);
}

export function toRoleSummaryDTOList(roles: readonly Role[]): RoleSummaryDTO[] {
  return roles.map(toRoleSummaryDTO);
}
