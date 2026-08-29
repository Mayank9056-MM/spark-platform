// apps/api/src/modules/rbac/permissions/permission.bootstrap.ts

import { prisma } from '../../../lib/prisma.js';

import { PERMISSION_CATALOG } from './permission.constants.js';
import { permissionRepository } from './permission.repository.js';

import { permissionLogger } from '@/lib/logger.js';

/**
 * Idempotent RBAC permission bootstrap.
 *
 * Ensures every entry in the central permission catalog
 * (permission.constants.ts's PERMISSION_CATALOG) exists in the database,
 * without deleting, resetting, or truncating anything else.
 *
 * This is the ONLY authoritative permission bootstrap mechanism. It does
 * not duplicate the catalog — it iterates PERMISSION_CATALOG directly and
 * delegates persistence to permissionRepository.upsertByKey, the exact
 * same idempotent upsert-by-key primitive permission.service.ts already
 * uses for upsertPermission(). There is no Department-specific code here:
 * department:create/read/update/delete are bootstrapped simply by being
 * entries in PERMISSION_CATALOG, the same as every other resource,
 * present and future.
 *
 * Idempotency: Permission.key is @unique, and upsertByKey's
 * `where: { key }` targets exactly that constraint — running this any
 * number of times converges to the same rows, updating only
 * displayName/description on repeat runs, never creating duplicates, and
 * never touching a permission's `id` or its `rolePermissions` relation
 * (the Prisma upsert's create/update data blocks never reference either).
 * The database's unique constraint on `key` remains the final
 * concurrency guarantee.
 *
 * All catalog entries are upserted inside a single transaction: either
 * every permission in the catalog ends up persisted, or none of this
 * run's changes are committed.
 *
 * Does NOT: create/modify Roles, create/modify RoleAssignments,
 * create/modify RolePermission rows, delete or reset anything, or depend
 * on Express/HTTP/any request context.
 *
 * Failures are never swallowed — a rejected upsert propagates out of
 * prisma.$transaction and out of this function.
 */
export async function bootstrapPermissions(): Promise<void> {
  permissionLogger.info('RBAC permission bootstrap started', {
    catalogSize: PERMISSION_CATALOG.length,
  });

  await prisma.$transaction(async (tx) => {
    for (const entry of PERMISSION_CATALOG) {
      await permissionRepository.upsertByKey(tx, entry);
    }
  });

  permissionLogger.info('RBAC permission bootstrap completed', {
    catalogSize: PERMISSION_CATALOG.length,
  });
}
