// apps/api/src/scripts/seed-permissions.ts

/**
 * CLI entrypoint for the RBAC permission bootstrap.
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
 * This script owns the process lifecycle: it calls bootstrapPermissions(),
 * logs success/failure, disconnects the shared Prisma client in a
 * `finally` block, and sets a non-zero exit code on failure. It performs
 * no migration, reset, or destructive operation.
 */

import { bootstrapPermissions } from '../modules/rbac/permissions/permission.bootstrap.js';

import { permissionLogger } from '@/lib/logger.js';
import { prisma } from '@/lib/prisma.js';

async function run(): Promise<void> {
  try {
    await bootstrapPermissions();
    permissionLogger.info('RBAC permission bootstrap script finished successfully');
  } catch (error) {
    permissionLogger.error('RBAC permission bootstrap script failed', { error });
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void run();
