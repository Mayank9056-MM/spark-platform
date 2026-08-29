// apps/api/src/scripts/bootstrap-initial-super-admin.ts

/**
 * CLI entrypoint for one-time initial super-admin provisioning.
 *
 *   pnpm --filter api run db:bootstrap:super-admin
 *
 * A distinct, later stage of the same install lifecycle that
 * seed-permissions.ts (RBAC bootstrap) begins:
 *
 *   RBAC bootstrap (seed-permissions.ts)
 *     → PERMISSION_CATALOG persisted, admin/super_admin system roles exist
 *   THIS SCRIPT
 *     → first privileged User + RoleAssignment(super_admin) persisted
 *
 * Deliberately kept separate from seed-permissions.ts: RBAC bootstrap is
 * infrastructure (safe to rerun indefinitely, never touches User); this
 * script provisions a real human-usable credential exactly once. An
 * operator can rerun RBAC bootstrap freely without ever risking a second
 * super-admin account.
 *
 * ── Non-goals ─────────────────────────────────────────────────────────
 * - Does NOT create/modify permissions or the admin/super_admin roles.
 *   Fails loudly if super_admin doesn't already exist correctly, rather
 *   than trying to fix or create it.
 * - Does NOT go through the public registration flow
 *   (userService.createUser + activation token + activateAccount) — that
 *   flow always creates a PENDING_ACTIVATION user with no password,
 *   correct for self-service signup, wrong for a scripted install step.
 *   Uses userRepository.createActivatedUser instead — a narrowly-scoped
 *   bootstrap-only primitive, analogous to roleRepository.createSystemRole.
 * - Does NOT reuse roleAssignmentService.createRoleAssignment — that
 *   service's assertCanAssignRole guard resolves an authenticated actor's
 *   own permissions, which has no meaning with no actor present. Calls
 *   roleAssignmentRepository.create() directly with grantedByUserId: null,
 *   a value the schema and repository already support explicitly.
 *
 * ── Credentials ───────────────────────────────────────────────────────
 * Read directly from process.env by this script only — deliberately NOT
 * added to config/env.ts's shared schema, which is parsed eagerly by
 * every process that imports it (including the main server). No defaults
 * exist for any of these; missing/invalid values fail immediately without
 * echoing the invalid value.
 *
 * ── Duplicate-provisioning guard ─────────────────────────────────────
 * Checks for any currently-ACTIVE RoleAssignment against the super_admin
 * role — the existing relational model already answers "has this been
 * provisioned," so no bootstrap-marker table was introduced. RoleAssignment
 * has no database uniqueness constraint over roleId restricting it to a
 * single active row, so this check is a fast-path only, not a full
 * concurrency guarantee: two concurrent runs with two different configured
 * emails could both pass it. Accepted as a known limitation for a script
 * meant to run once, by one operator, rather than solved with ad-hoc
 * locking or a schema change.
 *
 * ── Transaction boundary ─────────────────────────────────────────────
 * User creation, RoleAssignment creation, and both audit records happen
 * inside one prisma.$transaction. Password hashing happens before the
 * transaction opens (pure computation); the plaintext password is never
 * referenced again after that point.
 *
 * Never logs the plaintext password, the password hash, or the
 * provisioned email address. The audit record (a data trail, not a log
 * stream) does include email, matching userService.createUser's existing
 * audit convention.
 */

import { z } from 'zod';

import { recordAuditTx } from '../modules/audit/audit.service.js';
import { AuditEntityType } from '../modules/audit/audit.types.js';
import { roleAssignmentRepository } from '../modules/rbac/assignments/role-assignment.repository.js';
import { roleRepository } from '../modules/rbac/roles/role.repository.js';
import { userRepository } from '../modules/user/user.repository.js';

import { roleAssignmentLogger, userLogger } from '@/lib/logger.js';
import { hashPassword } from '@/lib/password.js';
import { prisma } from '@/lib/prisma.js';

const SUPER_ADMIN_ROLE_KEY = 'super_admin';

/**
 * NOTE: the password minimum here is a conservative floor, not a verified
 * match to the application's actual password policy (auth.validation.ts
 * was not inspected as part of this change).
 */
const credentialsSchema = z.object({
  INITIAL_SUPER_ADMIN_EMAIL: z.email(),
  INITIAL_SUPER_ADMIN_PASSWORD: z.string().min(12),
  INITIAL_SUPER_ADMIN_FIRST_NAME: z.string().min(1),
  INITIAL_SUPER_ADMIN_LAST_NAME: z.string().min(1),
});

async function run(): Promise<void> {
  try {
    userLogger.info('Initial super-admin provisioning started');

    const parsedCredentials = credentialsSchema.safeParse(process.env);
    if (!parsedCredentials.success) {
      userLogger.error(
        'Initial super-admin provisioning failed: invalid or missing configuration',
        { missingOrInvalidFields: Object.keys(parsedCredentials.error.flatten().fieldErrors) },
      );
      process.exitCode = 1;
      return;
    }

    const {
      INITIAL_SUPER_ADMIN_EMAIL: email,
      INITIAL_SUPER_ADMIN_PASSWORD: password,
      INITIAL_SUPER_ADMIN_FIRST_NAME: firstName,
      INITIAL_SUPER_ADMIN_LAST_NAME: lastName,
    } = parsedCredentials.data;

    const role = await roleRepository.findByKey(SUPER_ADMIN_ROLE_KEY, true);

    if (!role) {
      throw new Error(
        `Cannot provision initial super-admin: the "${SUPER_ADMIN_ROLE_KEY}" role does not ` +
          'exist. Run the RBAC bootstrap (pnpm db:seed:permissions) first.',
      );
    }
    if (!role.isSystemDefined) {
      throw new Error(
        `Cannot provision initial super-admin: a role with key "${SUPER_ADMIN_ROLE_KEY}" ` +
          'exists but is not system-defined. Resolve this conflict manually first.',
      );
    }
    if (role.deletedAt) {
      throw new Error(
        `Cannot provision initial super-admin: the "${SUPER_ADMIN_ROLE_KEY}" role is archived. ` +
          'Restore it explicitly before provisioning.',
      );
    }

    const existingAssignments = await roleAssignmentRepository.findManyByRole(role.id, true);
    if (existingAssignments.length > 0) {
      throw new Error('Initial super-admin provisioning has already been completed.');
    }

    const emailTaken = await userRepository.existsByEmail(email);
    if (emailTaken) {
      throw new Error(
        'Cannot provision initial super-admin: a user with the configured email already exists.',
      );
    }

    const passwordHash = await hashPassword(password);

    const { user, roleAssignment } = await prisma.$transaction(async (tx) => {
      const createdUser = await userRepository.createActivatedUser(tx, {
        email,
        firstName,
        lastName,
        passwordHash,
      });

      await recordAuditTx(tx, {
        actorUserId: null,
        action: 'CREATE',
        entityType: AuditEntityType.USER,
        entityId: createdUser.id,
        newValue: { email: createdUser.email, status: createdUser.status },
      });

      const createdAssignment = await roleAssignmentRepository.create(tx, null, {
        userId: createdUser.id,
        roleId: role.id,
        scope: { type: 'COLLEGE' },
      });

      await recordAuditTx(tx, {
        actorUserId: null,
        action: 'ROLE_GRANTED',
        entityType: AuditEntityType.ROLE_ASSIGNMENT,
        entityId: createdAssignment.id,
        newValue: {
          userId: createdAssignment.userId,
          roleId: createdAssignment.roleId,
          scope: { type: 'COLLEGE' },
          grantedByUserId: null,
        },
      });

      return { user: createdUser, roleAssignment: createdAssignment };
    });

    userLogger.info('Initial super-admin user created', { userId: user.id });
    roleAssignmentLogger.info('Initial super-admin role assignment created', {
      roleAssignmentId: roleAssignment.id,
      userId: user.id,
      roleId: role.id,
    });
    userLogger.info('Initial super-admin provisioning completed');
  } catch (error) {
    userLogger.error('Initial super-admin provisioning failed', { error });
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void run();
