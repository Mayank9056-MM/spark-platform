// apps/api/src/modules/rbac/roles/role.bootstrap.ts

import { prisma } from '../../../lib/prisma.js';
import { PERMISSION_CATALOG } from '../permissions/permission.constants.js';
import type { CatalogPermissionKey } from '../permissions/permission.constants.js';
import { permissionRepository } from '../permissions/permission.repository.js';
import type { PermissionId } from '../permissions/permission.types.js';

import { roleRepository } from './role.repository.js';

import { roleLogger } from '@/lib/logger.js';

/**
 * Idempotent RBAC system-role bootstrap.
 *
 * Ensures the platform's full initial role catalog exists as
 * `isSystemDefined: true` Role rows, each holding the permission set
 * declared in SYSTEM_ROLES below. `admin` and `super_admin` keep their
 * original, deliberate policy of holding the ENTIRE permission catalog
 * (PERMISSION_CATALOG) — completely unchanged from before. Every other
 * role (principal, hod, faculty, officer, clerk, student, secretary) gets
 * an explicit, curated subset, defined inline below — never inferred,
 * never exceeding what PERMISSION_CATALOG actually contains. Typing each
 * role's permissionKeys as `readonly CatalogPermissionKey[]` makes an
 * invented or misspelled key a compile error, not a silent runtime gap.
 *
 * ── Why `student` gets an empty permission set ──────────────────────
 * ScopeType is COLLEGE | DEPARTMENT only — there is no "own records" /
 * self scope anywhere in the schema or authorization model, and the
 * catalog has no `result`/`fee` resource at all. Granting `student` any
 * existing :read permission (e.g. attendance:read) would let them read
 * every attendance/lecture/timetable record at whatever scope their
 * assignment carries — college- or department-wide — not just their own.
 * That is a real over-exposure, not "student self-service," so this
 * bootstrap deliberately grants `student` NOTHING. Real self-service
 * access needs a scope-model addition (e.g. a SELF scope, or an
 * ownership-based authorization layer) that is explicitly OUT OF SCOPE
 * here — do not add one as part of this bootstrap.
 *
 * ── Scope caveat ──────────────────────────────────────────────────────
 * This file only creates Role and RolePermission rows. It never creates a
 * RoleAssignment, and RolePermission has no scope column — scope belongs
 * exclusively to RoleAssignment, assigned to a specific user elsewhere,
 * later. So every grant below (hod's included) is a plain, unscoped
 * resource:action RolePermission — identical in kind to admin/
 * super_admin's grants, just a smaller set. Whether a DEPARTMENT-scoped
 * RoleAssignment actually narrows what a role can do at runtime depends
 * entirely on whether each resource's routes pass a `getScope` resolver
 * into `authorize()` (see authorization.middleware.ts) — that has NOT
 * been verified against the department/timetable/facultyAssignment/
 * lecture/attendance/promotion/admission route files as part of this
 * task, and nothing here changes that route wiring.
 *
 * ── Naming convention ────────────────────────────────────────────────
 * Role keys stay lowercase snake_case (`principal`, `hod`, ...), matching
 * the existing `admin`/`super_admin` convention.
 *
 * ── Everything else is unchanged in spirit from before ──────────────
 * Same ordering dependency on bootstrapPermissions() having already run,
 * same idempotency guarantee (Role.key unique + upsertRoleGrants' INSERT
 * ... ON CONFLICT DO NOTHING — additive only, never revokes a grant that
 * falls out of a role's declared set on a later edit of this file), same
 * privilege-escalation guard (refuses to "adopt" a same-keyed non-system
 * role), same archived-role guard, same pre-flight-reads-then-single-
 * transaction-writes structure.
 */

interface SystemRoleDefinition {
  readonly key: string;
  readonly displayName: string;
  /**
   * 'ALL' preserves admin/super_admin's original documented policy.
   * Every other role gets an explicit array — a deliberate subset of
   * PERMISSION_CATALOG, never the full catalog by default.
   */
  readonly permissionKeys: 'ALL' | readonly CatalogPermissionKey[];
}

const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
  { key: 'admin', displayName: 'Administrator', permissionKeys: 'ALL' },
  { key: 'super_admin', displayName: 'Super Administrator', permissionKeys: 'ALL' },
  {
    key: 'principal',
    displayName: 'Principal',
    permissionKeys: [
      'department:read',
      'program:read',
      'curriculumVersion:read',
      'semesterCatalog:read',
      'subject:read',
      'electiveGroup:read',
      'academicYear:read',
      'admission:read',
      'promotion:read',
      'facultyAssignment:read',
      'timetable:read',
      'lecture:read',
      'attendance:read',
      'user:read',
    ],
  },
  {
    key: 'hod',
    displayName: 'Head of Department',
    permissionKeys: [
      'department:read',
      'program:read',
      'curriculumVersion:read',
      'semesterCatalog:read',
      'subject:read',
      'electiveGroup:read',
      'academicYear:read',
      'admission:read',
      'promotion:create',
      'promotion:read',
      'facultyAssignment:create',
      'facultyAssignment:read',
      'timetable:create',
      'timetable:read',
      'lecture:create',
      'lecture:read',
      'attendance:read',
      'user:read',
    ],
  },
  {
    key: 'faculty',
    displayName: 'Faculty',
    permissionKeys: [
      'subject:read',
      'facultyAssignment:read',
      'timetable:read',
      'semesterCatalog:read',
      'academicYear:read',
      'department:read',
    ],
  },
  {
    key: 'officer',
    displayName: 'Officer',
    permissionKeys: [
      'user:read',
      'department:read',
      'program:read',
      'curriculumVersion:read',
      'semesterCatalog:read',
      'subject:read',
      'electiveGroup:read',
      'academicYear:read',
      'admission:create',
      'admission:read',
      'admission:update',
      'facultyAssignment:read',
      'timetable:read',
    ],
  },
  {
    key: 'clerk',
    displayName: 'Clerk',
    permissionKeys: [
      'user:read',
      'department:read',
      'program:read',
      'semesterCatalog:read',
      'admission:create',
      'admission:read',
    ],
  },
  {
    key: 'student',
    displayName: 'Student',
    // Deliberately empty — see file header.
    permissionKeys: [],
  },
  {
    key: 'secretary',
    displayName: 'Secretary',
    permissionKeys: [
      'user:read',
      'department:read',
      'program:read',
      'curriculumVersion:read',
      'semesterCatalog:read',
      'academicYear:read',
      'admission:read',
      'promotion:read',
      'facultyAssignment:read',
      'timetable:read',
    ],
  },
];

export async function bootstrapSystemRoles(): Promise<void> {
  roleLogger.info('RBAC system role bootstrap started', {
    roleCount: SYSTEM_ROLES.length,
    catalogSize: PERMISSION_CATALOG.length,
  });

  // ── Pre-flight: resolve every catalog permission's database id ─────
  // Still resolves the FULL catalog (not just what's referenced below):
  // this preserves the existing invariant check that bootstrapPermissions()
  // has fully run, and 'ALL' roles need every id regardless.
  const permissionIdByKey = new Map<CatalogPermissionKey, PermissionId>();
  for (const entry of PERMISSION_CATALOG) {
    const permission = await permissionRepository.findByKey(entry.key);
    if (!permission) {
      throw new Error(
        `RBAC bootstrap invariant violated: permission "${entry.key}" is missing ` +
          'from the database. bootstrapPermissions() must run before ' +
          'bootstrapSystemRoles().',
      );
    }
    permissionIdByKey.set(entry.key, permission.id);
  }
  const allPermissionIds = [...permissionIdByKey.values()];

  /** Resolves a role definition's declared keys to database ids, failing loudly on an unknown key. */
  function resolvePermissionIds(def: SystemRoleDefinition): PermissionId[] {
    if (def.permissionKeys === 'ALL') {
      return allPermissionIds;
    }
    return def.permissionKeys.map((key) => {
      const id = permissionIdByKey.get(key);
      if (!id) {
        // Unreachable given CatalogPermissionKey's compile-time constraint
        // and the full-catalog pre-flight loop above — fails loudly rather
        // than silently granting nothing if it ever somehow isn't.
        throw new Error(
          `RBAC bootstrap invariant violated: role "${def.key}" references unknown ` +
            `permission "${key}".`,
        );
      }
      return id;
    });
  }

  // ── Pre-flight: classify each intended system role against current state ──
  const rolesToEnsure: {
    readonly key: string;
    readonly displayName: string;
    readonly existingId: string | null;
    readonly permissionIds: readonly PermissionId[];
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
      throw new Error(
        `RBAC bootstrap conflict: the system-defined role "${roleDef.key}" exists but is ` +
          'archived (deletedAt is set). Refusing to silently revive it, grant permissions ' +
          'to it while archived, or proceed with only a partial system-role set. Restore it ' +
          'explicitly (roleRepository.restore) before rerunning the bootstrap.',
      );
    }

    rolesToEnsure.push({
      key: roleDef.key,
      displayName: roleDef.displayName,
      existingId: existing ? existing.id : null,
      permissionIds: resolvePermissionIds(roleDef),
    });
  }

  // ── Write phase: ensure each role exists and holds at least its declared grants ──
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

      const newlyGrantedCount = await permissionRepository.upsertRoleGrants(
        tx,
        roleId,
        roleDef.permissionIds,
      );

      roleLogger.info('RBAC system role ensured', {
        key: roleDef.key,
        roleId,
        totalPermissionCount: roleDef.permissionIds.length,
        newlyGrantedCount,
      });
    }
  });

  roleLogger.info('RBAC system role bootstrap completed');
}
