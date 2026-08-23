// apps/api/src/modules/rbac/permissions/permission.mapper.ts

import type { Permission } from '@spark/database/client';

import type { PermissionKey } from '../authorization/authorization.types.js';

import type { PermissionDTO, PermissionSummaryDTO } from './permission.types.js';

/**
 * Persistence → DTO boundary for the Permission domain. This must be the
 * ONLY place a Prisma `Permission` row is shaped into `PermissionDTO` /
 * `PermissionSummaryDTO` — route every Permission-returning endpoint
 * through this file, the same convention `auth.mapper.ts`'s `toPublicUser`
 * establishes for `User`.
 *
 * Permission is a global, non-organization-scoped catalog (see
 * schema.prisma / permission.types.ts) — this mapper never introduces an
 * `organizationId` field.
 */

/**
 * `Permission.key` is an unconstrained, globally-unique `string` column in
 * the database — nothing at the schema level enforces the
 * `resource:action` template shape. `PermissionKey` (authorization.types.ts)
 * is a compile-time-only template-literal type with no runtime brand and
 * no exported validator/parser in that file to reuse.
 *
 * Every write path that exists today (`permission.repository.ts`'s
 * `create`/`upsertByKey`) constructs `key` exclusively as
 * `` `${resource}:${action}` `` from typed `AuthorizationResource`/
 * `AuthorizationAction` values, so a row read back out is expected to
 * already match the pattern. This cast documents that expectation rather
 * than inventing a second, competing runtime validation system inside the
 * mapper. It is a real gap, not a solved one: a row written by any future
 * path that bypasses the repository (a manual SQL fix, a bad migration)
 * would not be caught here. See the final report's "PermissionKey
 * Decision" note.
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

export function toPermissionSummaryDTO(permission: Permission): PermissionSummaryDTO {
  return {
    id: permission.id,
    key: toPermissionKey(permission.key),
    displayName: permission.displayName,
  };
}

export function toPermissionDTOList(permissions: readonly Permission[]): PermissionDTO[] {
  return permissions.map(toPermissionDTO);
}

export function toPermissionSummaryDTOList(
  permissions: readonly Permission[],
): PermissionSummaryDTO[] {
  return permissions.map(toPermissionSummaryDTO);
}
