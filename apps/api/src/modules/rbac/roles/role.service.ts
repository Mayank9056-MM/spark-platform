// apps/api/src/modules/rbac/roles/role.service.ts

import type { RolePermission } from '@spark/database/client';
import { createChildLogger } from '@spark/shared/logger';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import type { OrganizationId } from '../authorization/authorization.types.js';
import { permissionService } from '../permissions/permission.service.js';
import type { PermissionId } from '../permissions/permission.types.js';

import { toRoleDTO, toRoleDTOList, toRoleWithPermissionsDTO } from './role.mapper.js';
import { roleRepository } from './role.repository.js';
import type {
  CreateRoleInput,
  ListRolesFilters,
  ListRolesOptions,
  ListRolesResult,
  RoleDTO,
  RoleId,
  RoleWithPermissionsDTO,
  UpdateRoleInput,
} from './role.types.js';

const roleLogger = createChildLogger({ component: 'role' });

/**
 * Business-logic layer for the Role domain. Answers "what business
 * operation is valid" — never "is this user allowed to do X" (that's
 * authorization.service.ts) and never "what exists in the database"
 * directly (that's role.repository.ts).
 *
 * Role is organization-scoped; every method here that touches an existing
 * Role takes `organizationId` as an explicit, trusted parameter (supplied
 * by the caller/auth context, never client body input) and uses
 * role.repository.ts's tenant-scoped composite lookups exclusively. There
 * is no method here that can read/write a Role without an organizationId.
 *
 * DTO boundary: read/write operations that represent a service/API-facing
 * Role return `RoleDTO`/`RoleWithPermissionsDTO`/`ListRolesResult` via
 * role.mapper.ts, never a raw Prisma `Role`. role.repository.ts remains
 * persistence-only.
 */
export class RoleService {
  // ── Role CRUD ─────────────────────────────────────────────────────

  /**
   * Ordinary role creation only — always produces `isSystemDefined: false`
   * by construction, since `CreateRoleInput` has no such field and this
   * method calls `roleRepository.create()`, never `createSystemRole()`.
   * The latter is a trusted bootstrap/seed primitive with no legitimate
   * caller in this service; exposing it here would let an ordinary
   * administrative request manufacture a protected role.
   *
   * `existsByKey()` is a fast-path duplicate check only, mirroring
   * UserService.createUser/PermissionService.assignToRole's established
   * convention — it is NOT the concurrency guarantee. Under a genuine
   * race, the DB's `@@unique([organizationId, key])` constraint rejects
   * the duplicate insert with P2002, mapped globally to 409
   * DUPLICATE_ENTRY. No duplicate concurrency logic is added here.
   */
  async createRole(
    actorUserId: string,
    organizationId: OrganizationId,
    input: CreateRoleInput,
  ): Promise<RoleDTO> {
    const keyTaken = await roleRepository.existsByKey(organizationId, input.key);
    if (keyTaken) {
      throw ApiError.conflict('A role with this key already exists', ErrorCode.DUPLICATE_ENTRY);
    }

    const role = await prisma.$transaction(async (tx) => {
      const created = await roleRepository.create(tx, organizationId, input);

      await recordAuditTx(tx, {
        organizationId,
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.ROLE,
        entityId: created.id,
        newValue: { key: created.key, displayName: created.displayName },
      });

      return created;
    });

    roleLogger.info('Role created', { roleId: role.id, organizationId, actorUserId });

    return toRoleDTO(role);
  }

  async getById(organizationId: OrganizationId, roleId: RoleId): Promise<RoleDTO> {
    const role = await roleRepository.findById(organizationId, roleId);
    if (!role) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toRoleDTO(role);
  }

  /**
   * Also serves the "get a role's permissions" use case — a separate
   * `getRolePermissions()` returning the same underlying data through a
   * different name would be a redundant wrapper, not a distinct
   * capability, so none is added.
   */
  async getByIdWithPermissions(
    organizationId: OrganizationId,
    roleId: RoleId,
  ): Promise<RoleWithPermissionsDTO> {
    const role = await roleRepository.findByIdWithPermissions(organizationId, roleId);
    if (!role) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toRoleWithPermissionsDTO(role);
  }

  async getByKey(organizationId: OrganizationId, key: string): Promise<RoleDTO> {
    const role = await roleRepository.findByKey(organizationId, key);
    if (!role) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toRoleDTO(role);
  }

  /**
   * `filters.organizationId` is part of `ListRolesFilters` itself (see
   * role.types.ts) — the trusted tenant scope travels with the filter
   * object rather than as a separate parameter here, matching the
   * existing contract exactly. One repository query + one count query;
   * mapping is pure and adds no additional database access.
   */
  async listRoles(filters: ListRolesFilters, options: ListRolesOptions): Promise<ListRolesResult> {
    const result = await roleRepository.findMany(filters, options);
    return {
      roles: toRoleDTOList(result.roles),
      total: result.total,
    };
  }

  /**
   * Only `displayName` is mutable — `UpdateRoleInput`'s shape already
   * excludes `key`/`isSystemDefined` at the type level, so there is
   * nothing here that could accidentally change a role's identity or
   * protection flag. Uses the repository's composite tenant-safe
   * selector (`organizationId_id`) via `roleRepository.update()`, so
   * Postgres itself rejects an update whose (organizationId, id) pair
   * doesn't match an existing row together.
   *
   * DELIBERATE DECISION — system-defined roles ARE allowed to have their
   * displayName changed here (no `isSystemDefined` guard in this method).
   * This is not an oversight: role.types.ts's own doc comment on
   * `RoleDTO` describes `displayName` as "the mutable, human-facing
   * label" without qualifying that by system-defined status, and
   * `UpdateRoleInput`'s doc comment frames excluding `key`/
   * `isSystemDefined` as the entire protection surface — identity and
   * the protection flag itself are what's guarded, not the label. A
   * platform-seeded role's *identity* (`key`, `organizationId`,
   * `isSystemDefined`) and its granted permissions remain fully
   * protected (the latter only insofar as nothing in this file grants
   * blanket RolePermission access); only the human-facing display text
   * may be localized/renamed by an organization administrator. If this
   * reading is wrong for your deployment, the fix is a one-line guard
   * here (`if (existing.isSystemDefined) throw ApiError.badRequest(...)`),
   * not a schema change.
   */
  async updateRole(
    actorUserId: string,
    organizationId: OrganizationId,
    roleId: RoleId,
    input: UpdateRoleInput,
  ): Promise<RoleDTO> {
    const existing = await roleRepository.findById(organizationId, roleId);
    if (!existing) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await roleRepository.update(tx, organizationId, roleId, input);

      await recordAuditTx(tx, {
        organizationId,
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.ROLE,
        entityId: existing.id,
        oldValue: { displayName: existing.displayName },
        newValue: {
          ...(input.displayName !== undefined && { displayName: input.displayName }),
        },
      });

      return result;
    });

    roleLogger.info('Role updated', { roleId: existing.id, organizationId, actorUserId });

    return toRoleDTO(updated);
  }

  /**
   * Soft delete only, via `roleRepository.archive()` — never a physical
   * DELETE, matching the schema's `deletedAt` field and the project's
   * established convention (UserService.archiveUser).
   *
   * System-defined roles are refused: `role.repository.ts` documents that
   * this policy decision belongs to role.service.ts (see its
   * `createSystemRole`/`isSystemDefined` comments), and archiving a
   * system-defined role (e.g. an organization's baseline "admin" role)
   * would be a destructive RBAC-integrity operation with no schema-level
   * guard against it. This is a deliberate business-rule decision made
   * here, not something the schema or types enforce directly — flagged
   * explicitly in the final report.
   */
  async archiveRole(
    actorUserId: string,
    organizationId: OrganizationId,
    roleId: RoleId,
  ): Promise<void> {
    const existing = await roleRepository.findById(organizationId, roleId);
    if (!existing) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }

    if (existing.isSystemDefined) {
      throw ApiError.badRequest('System-defined roles cannot be archived');
    }

    await prisma.$transaction(async (tx) => {
      const archived = await roleRepository.archive(tx, organizationId, existing.id);

      await recordAuditTx(tx, {
        organizationId,
        actorUserId,
        action: 'ARCHIVE',
        entityType: AuditEntityType.ROLE,
        entityId: existing.id,
        oldValue: { deletedAt: existing.deletedAt ? existing.deletedAt.toISOString() : null },
        newValue: { deletedAt: archived.deletedAt ? archived.deletedAt.toISOString() : null },
      });
    });

    roleLogger.info('Role archived', { roleId: existing.id, organizationId, actorUserId });
  }

  /**
   * `includeDeleted = true` on the lookup is required here — an archived
   * role is, by definition, excluded from `findById`'s default query, so
   * a plain `findById` would always 404 before restore could ever run.
   * Matches UserService.restoreUser's identical pattern.
   */
  async restoreRole(
    actorUserId: string,
    organizationId: OrganizationId,
    roleId: RoleId,
  ): Promise<RoleDTO> {
    const existing = await roleRepository.findById(organizationId, roleId, true);
    if (!existing) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const restored = await prisma.$transaction(async (tx) => {
      const result = await roleRepository.restore(tx, organizationId, existing.id);

      await recordAuditTx(tx, {
        organizationId,
        actorUserId,
        action: 'RESTORE',
        entityType: AuditEntityType.ROLE,
        entityId: existing.id,
        oldValue: { deletedAt: existing.deletedAt ? existing.deletedAt.toISOString() : null },
        newValue: { deletedAt: null },
      });

      return result;
    });

    roleLogger.info('Role restored', { roleId: existing.id, organizationId, actorUserId });

    return toRoleDTO(restored);
  }

  // ── Role ↔ Permission ────────────────────────────────────────────

  /**
   * Coordinates tenant validation (Role's responsibility — Permission is
   * global and permission.service.ts has no independent way to verify
   * `roleId` belongs to this organization) with the actual grant, which
   * is delegated to `permissionService.assignToRole()` rather than
   * reimplemented here. That method owns the duplicate-assignment check,
   * the transaction, and the SOLE authoritative audit write for the
   * RolePermission mutation — this method does not record a second one.
   * Duplicating that logic here would be exactly the "RoleService →
   * PermissionService → RoleService" style duplication the task warns
   * against.
   *
   * The trusted `organizationId` this method already resolved for the
   * tenant-ownership check is now passed straight through to
   * `permissionService.assignToRole()`, which uses it solely to attribute
   * its audit record to the correct tenant (never to filter/validate the
   * RolePermission row itself, which has no organizationId column). This
   * closes the previous gap where that audit record was written with
   * `organizationId: null` — see permission.service.ts's updated
   * `assignToRole()` doc comment for the persistence-side half of this
   * fix.
   *
   * Return type stays `Promise<RolePermission>` (the raw Prisma join
   * record) — documented technical debt, not an oversight.
   * permission.types.ts defines no RolePermission-facing DTO yet (its
   * `RolePermissionLink` is a distinct, pre-existing type not wired in
   * here), and inventing one is out of scope for this fix; introducing a
   * new DTO/file solely for theoretical purity was explicitly avoided.
   */
  async grantPermissionToRole(
    actorUserId: string,
    organizationId: OrganizationId,
    roleId: RoleId,
    permissionId: PermissionId,
  ): Promise<RolePermission> {
    const role = await roleRepository.findById(organizationId, roleId);
    if (!role) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const link = await permissionService.assignToRole(actorUserId, organizationId, {
      roleId,
      permissionId,
    });

    roleLogger.info('Permission granted to role', {
      roleId,
      permissionId,
      organizationId,
      actorUserId,
    });

    return link;
  }

  /**
   * Same tenant-check-then-delegate shape as grantPermissionToRole(), and
   * the same organizationId pass-through fix applies here — see that
   * method's doc comment.
   */
  async revokePermissionFromRole(
    actorUserId: string,
    organizationId: OrganizationId,
    roleId: RoleId,
    permissionId: PermissionId,
  ): Promise<void> {
    const role = await roleRepository.findById(organizationId, roleId);
    if (!role) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }

    await permissionService.revokeFromRole(actorUserId, organizationId, roleId, permissionId);

    roleLogger.info('Permission revoked from role', {
      roleId,
      permissionId,
      organizationId,
      actorUserId,
    });
  }
}

export const roleService = new RoleService();
