// apps/api/src/modules/rbac/roles/role.bootstrap.ts

import { prisma } from '../../../lib/prisma.js';
import { PERMISSION_CATALOG } from '../permissions/permission.constants.js';
import { permissionRepository } from '../permissions/permission.repository.js';
import type { PermissionId } from '../permissions/permission.types.js';

import { roleRepository } from './role.repository.js';

import { roleLogger } from '@/lib/logger.js';

/**
 * Idempotent RBAC system-role bootstrap.
 *
 * Ensures the platform's protected administrative roles — `admin` and
 * `super_admin` — exist as `isSystemDefined: true` Role rows and hold
 * every permission currently defined in PERMISSION_CATALOG
 * (permission.constants.ts). This is a deliberate, explicit policy
 * decision (both roles receive identical, full-catalog privileges), not
 * an inference drawn from either role's name.
 *
 * These two keys match `middlewares/interim-admin.guard.ts`'s existing
 * `ADMIN_ROLE_KEYS = ['admin', 'super_admin']` exactly — this file
 * fulfills a naming convention that guard already assumed exists,
 * rather than introducing a new one.
 *
 * ── Ordering dependency ─────────────────────────────────────────────
 * This function assumes bootstrapPermissions() (permission.bootstrap.ts)
 * has already run to completion and committed — every PERMISSION_CATALOG
 * entry must already exist as a Permission row before this runs, since
 * RolePermission.permissionId is a real foreign key. The pre-flight
 * resolution loop below fails loudly (rather than silently no-op'ing)
 * if that invariant doesn't hold, so a caller that gets the order wrong
 * finds out immediately, not via a confusing empty result.
 *
 * ── Idempotency ──────────────────────────────────────────────────────
 * Role identity is `Role.key` (@unique). RolePermission identity is the
 * composite (roleId, permissionId) primary key. Both are honored via
 * upsert-shaped primitives (roleRepository.createSystemRole is
 * insert-only and is therefore only called when no existing row was
 * found in the pre-flight read; permissionRepository.upsertRoleGrant is
 * a true upsert). Running this any number of times converges to the
 * same two roles holding the same full grant set — never duplicate
 * roles, never duplicate RolePermission rows, never a second identity
 * for `admin`/`super_admin`.
 *
 * ── Privilege-escalation guard ───────────────────────────────────────
 * If a role with key `admin` or `super_admin` already exists but is NOT
 * system-defined (e.g. an operator previously created an ordinary role
 * that happens to use that key through the regular role API), this
 * function refuses to proceed for that role and throws — it will never
 * silently grant every catalog permission to a role it didn't itself
 * provision as protected. If the existing role IS system-defined but
 * has been archived (`deletedAt` set), it is skipped with a warning
 * rather than silently revived or silently granted permissions while
 * still archived — restoring a role is a distinct, deliberate lifecycle
 * action outside this bootstrap's scope.
 *
 * ── Transaction boundary ─────────────────────────────────────────────
 * All reads (resolving permission ids, classifying each role's current
 * state) happen before any write, matching this codebase's established
 * convention (see role.service.ts's createRole: existsByKey check
 * outside the transaction, mutation inside it). All writes — every role
 * creation and every RolePermission grant, across both system roles —
 * happen inside a single `prisma.$transaction`: either the entire batch
 * commits, or none of it does, so no role is ever left half-granted.
 *
 * This function deliberately does NOT touch or re-wrap
 * bootstrapPermissions()'s own transaction — that remains its own
 * independently atomic, unmodified step. The two-step ordering
 * (permissions commit fully, then roles/grants commit fully) is what
 * guarantees correctness, not a shared transaction across both.
 *
 * Does NOT: create RoleAssignments, assign either role to any user,
 * modify any pre-existing custom role, or depend on Express/HTTP/any
 * authenticated actor.
 *
 * Failures are never swallowed — a thrown conflict/invariant error, or
 * any rejected write, propagates out of this function uncaught.
 */

interface SystemRoleDefinition {
  readonly key: string;
  readonly displayName: string;
}

const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
  { key: 'admin', displayName: 'Administrator' },
  { key: 'super_admin', displayName: 'Super Administrator' },
];

export async function bootstrapSystemRoles(): Promise<void> {
  roleLogger.info('RBAC system role bootstrap started', {
    roleCount: SYSTEM_ROLES.length,
    catalogSize: PERMISSION_CATALOG.length,
  });

  // ── Pre-flight: resolve every catalog permission's database id ─────
  const permissionIds: PermissionId[] = [];
  for (const entry of PERMISSION_CATALOG) {
    const permission = await permissionRepository.findByKey(entry.key);
    if (!permission) {
      throw new Error(
        `RBAC bootstrap invariant violated: permission "${entry.key}" is missing ` +
          'from the database. bootstrapPermissions() must run before ' +
          'bootstrapSystemRoles().',
      );
    }
    permissionIds.push(permission.id);
  }

  // ── Pre-flight: classify each intended system role against current state ──
  const rolesToEnsure: {
    readonly key: string;
    readonly displayName: string;
    readonly existingId: string | null;
  }[] = [];

  for (const roleDef of SYSTEM_ROLES) {
    const existing = await roleRepository.findByKey(roleDef.key, true);

    if (existing && !existing.isSystemDefined) {
      throw new Error(
        `RBAC bootstrap conflict: a role with key "${roleDef.key}" already exists ` +
          'but is not system-defined. Refusing to automatically grant ' +
          'administrative permissions to a non-system role. Resolve this ' +
          'manually (rename or archive the conflicting role) before rerunning ' +
          'the bootstrap.',
      );
    }

    if (existing?.deletedAt) {
      roleLogger.warn('RBAC bootstrap: system role exists but is archived — skipping', {
        key: roleDef.key,
        roleId: existing.id,
      });
      continue;
    }

    rolesToEnsure.push({
      key: roleDef.key,
      displayName: roleDef.displayName,
      existingId: existing ? existing.id : null,
    });
  }

  // ── Write phase: ensure each role exists and holds every catalog permission ──
  await prisma.$transaction(async (tx) => {
    for (const roleDef of rolesToEnsure) {
      const roleId =
        roleDef.existingId ??
        (
          await roleRepository.createSystemRole(tx, {
            key: roleDef.key,
            displayName: roleDef.displayName,
          })
        ).id;

      for (const permissionId of permissionIds) {
        await permissionRepository.upsertRoleGrant(tx, roleId, permissionId);
      }

      roleLogger.info('RBAC system role ensured', {
        key: roleDef.key,
        roleId,
        grantedPermissionCount: permissionIds.length,
      });
    }
  });

  roleLogger.info('RBAC system role bootstrap completed');
}
