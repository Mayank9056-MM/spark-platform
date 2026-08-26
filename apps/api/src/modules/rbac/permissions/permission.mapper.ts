// apps/api/src/modules/rbac/permissions/permission.mapper.ts

import type { Permission } from '@spark/database/client';

import type { PermissionKey } from '../authorization/authorization.types.js';

import type { PermissionDTO, PermissionSummaryDTO } from './permission.types.js';

/**
 * Persistence → DTO boundary for the Permission domain.
 *
 * This is the only place where a persisted Prisma Permission row should be
 * shaped into PermissionDTO or PermissionSummaryDTO.
 *
 * The mapper is deterministic and side-effect free:
 *
 * - no database queries
 * - no repository/service calls
 * - no authorization decisions
 * - no audit operations
 * - no mutation of the input
 *
 * Permissions are global capability definitions in the single-college
 * architecture. They are not scoped to a college, department, division,
 * user, or role.
 *
 * Scope is applied through RoleAssignment, not Permission.
 */

/**
 * Converts the persisted Permission.key string into the domain
 * PermissionKey type.
 *
 * Permission.key is persisted as a string, while PermissionKey is a
 * compile-time template-literal type.
 *
 * All application write paths currently construct permission keys from
 * typed AuthorizationResource and AuthorizationAction values using:
 *
 *   `${resource}:${action}`
 *
 * Therefore the mapper preserves that established domain contract rather
 * than introducing a second runtime parser or validator.
 *
 * This is intentionally a type-level boundary. It does not transform,
 * normalize, or modify the persisted key.
 */
function toPermissionKey(key: string): PermissionKey {
  return key as PermissionKey;
}

export function toPermissionDTO(permission: Permission): PermissionDTO {
  return {
    id: permission.id,
    key: toPermissionKey(permission.key),
    displayName: permission.displayName,
    description: permission.description,
    createdAt: permission.createdAt.toISOString(),
  };
}

/**
 * Maps a Permission persistence model to its lightweight summary DTO.
 *
 * Only fields defined by PermissionSummaryDTO are exposed.
 */
export function toPermissionSummaryDTO(permission: Permission): PermissionSummaryDTO {
  return {
    id: permission.id,
    key: toPermissionKey(permission.key),
    displayName: permission.displayName,
  };
}

/**
 * Maps a collection of Permission records to PermissionDTOs.
 */
export function toPermissionDTOList(permissions: readonly Permission[]): PermissionDTO[] {
  return permissions.map(toPermissionDTO);
}

/**
 * Maps a collection of Permission records to lightweight summary DTOs.
 */
export function toPermissionSummaryDTOList(
  permissions: readonly Permission[],
): PermissionSummaryDTO[] {
  return permissions.map(toPermissionSummaryDTO);
}
