// apps/api/src/scripts/seed-permissions.ts

/**
 * CLI entrypoint for the RBAC bootstrap.
 *
 * Primary invocation (independent of Prisma's automatic seed detection):
 *
 *   pnpm --filter api run db:seed:permissions
 *
 * This is also the exact command configured as `migrations.seed` in
 * packages/database/prisma.config.ts, so `prisma db seed` and
 * `prisma migrate dev` invoke this same path — there is only one
 * bootstrap implementation, never two.
 *
 * Despite the historical script/command name (kept unchanged to avoid
 * touching prisma.config.ts and package.json wiring across the
 * monorepo), this now runs the complete RBAC bootstrap, in the required
 * order:
 *
 *   1. bootstrapPermissions() — ensures every PERMISSION_CATALOG entry
 *      exists as a Permission row.
 *   2. bootstrapSystemRoles() — ensures the system-defined `admin` and
 *      `super_admin` roles exist and hold every permission in the
 *      catalog. Always runs second: RolePermission rows reference
 *      Permission by id, so step 1 must have already committed.
 *
 * This script owns the process lifecycle: it logs success/failure,
 * disconnects the shared Prisma client in a `finally` block, and sets a
 * non-zero exit code on failure. It performs no migration, reset, or
 * destructive operation.
 */

import { bootstrapPermissions } from '../modules/rbac/permissions/permission.bootstrap.js';
import { bootstrapSystemRoles } from '../modules/rbac/roles/role.bootstrap.js';

import { permissionLogger } from '@/lib/logger.js';
import { prisma } from '@/lib/prisma.js';

async function run(): Promise<void> {
  try {
    await bootstrapPermissions();
    await bootstrapSystemRoles();
    permissionLogger.info('RBAC bootstrap script finished successfully');
  } catch (error) {
    permissionLogger.error('RBAC bootstrap script failed', { error });
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void run();
