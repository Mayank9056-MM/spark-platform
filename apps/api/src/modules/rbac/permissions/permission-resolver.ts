// apps/api/src/modules/rbac/authorization/permission-resolver.ts

import type { Permission } from '@spark/database/client';

import { permissionRepository } from '../permissions/permission.repository.js';
import type { ResolvePermissionsForRolesInput } from '../permissions/permission.types.js';

/**
 * Resolves the effective permission set granted by a trusted set of role
 * IDs.
 *
 * This module answers exactly one question:
 *
 *   "Given these trusted role IDs, what permissions do they collectively
 *   grant?"
 *
 * It does not decide whether an operation is authorized. It does not
 * resolve which roles a user holds, whether a role assignment is
 * currently active, or whether a scope covers a requested scope — those
 * are the responsibilities of role-assignment.service.ts, scope-
 * resolver.ts, and authorization.service.ts respectively. The role IDs
 * passed in here are assumed to have already been resolved and trusted
 * by the caller; this resolver never inspects a user, a session, a JWT,
 * or an Express request.
 *
 * Permissions are global capability definitions in the single-college
 * architecture — there is no organizationId/tenant filtering here, and
 * none should be added.
 *
 * Persistence is delegated entirely to permissionRepository. This file
 * never imports Prisma directly and never opens a transaction — this is
 * a read-only resolution operation.
 *
 * Deduplication: permissionRepository.resolvePermissionsForRoles already
 * deduplicates by Permission ID across the supplied role IDs, so a
 * permission granted through multiple roles is returned only once. This
 * resolver does not perform a second, redundant deduplication pass.
 *
 * Empty role IDs: resolved to `[]` (or an empty Map, for the grouped
 * variant) without querying the repository, so the "no roles" case is
 * deterministic and never incurs a database round-trip.
 */
export class PermissionResolver {
  async resolve(input: ResolvePermissionsForRolesInput): Promise<Permission[]> {
    if (input.roleIds.length === 0) {
      return [];
    }

    return permissionRepository.resolvePermissionsForRoles(input);
  }

  /**
   * Resolves the effective permissions granted by a trusted set of role
   * IDs, grouped by the role that grants each permission.
   *
   * Unlike resolve(), which returns a single deduplicated Permission[]
   * across all supplied roles, this preserves the roleId → permissions
   * association. authorization.service.ts needs this because a requested
   * permission and a requested scope must be evaluated from the same
   * role assignment — combining a permission granted by one role with a
   * scope granted by a different role would be a security defect.
   *
   * This performs the same single batched repository query as resolve();
   * it does not issue one query per role.
   *
   * Empty role IDs resolve to an empty Map without querying the
   * repository, matching resolve()'s existing empty-input behavior.
   */
  async resolveGroupedByRole(
    input: ResolvePermissionsForRolesInput,
  ): Promise<ReadonlyMap<string, Permission[]>> {
    if (input.roleIds.length === 0) {
      return new Map();
    }

    return permissionRepository.resolvePermissionsForRolesGrouped(input);
  }
}

export const permissionResolver = new PermissionResolver();
