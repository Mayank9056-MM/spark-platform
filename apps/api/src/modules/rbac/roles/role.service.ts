// apps/api/src/modules/rbac/roles/role.service.ts

import type { RolePermission } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
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

import { roleLogger } from '@/lib/logger.js';

/**
 * Business-logic layer for the Role domain.
 *
 * The application is single-college. Roles therefore have no tenant or
 * organization context.
 *
 * This service owns:
 *
 * - role business rules
 * - system-defined role protection
 * - duplicate-role handling
 * - role lifecycle operations
 * - coordination between Role and Permission domains
 * - transactional audit writes
 *
 * This service does NOT:
 *
 * - make authorization decisions
 * - access Prisma models directly for domain reads/writes
 * - perform HTTP validation
 * - resolve scope ownership
 *
 * Persistence belongs to role.repository.ts.
 * Authorization belongs to authorization.service.ts.
 * HTTP validation belongs to role.validation.ts.
 * Scope ownership belongs to scope.service.ts.
 *
 * DTO boundary:
 * Raw Role persistence records are converted through role.mapper.ts.
 */
export class RoleService {
  // ── Role CRUD ─────────────────────────────────────────────────────

  /**
   * Creates an ordinary application role.
   *
   * Ordinary role creation always produces isSystemDefined=false.
   * Callers cannot manufacture system-defined roles through this method.
   */

  async createRole(actorUserId: string, input: CreateRoleInput): Promise<RoleDTO> {
    const keyTaken = await roleRepository.existsByKey(input.key);
    if (keyTaken) {
      throw ApiError.conflict('A role with this key already exists', ErrorCode.DUPLICATE_ENTRY);
    }

    const role = await prisma.$transaction(async (tx) => {
      const created = await roleRepository.create(tx, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.ROLE,
        entityId: created.id,
        newValue: { key: created.key, displayName: created.displayName },
      });

      return created;
    });

    roleLogger.info('Role created', { roleId: role.id, actorUserId });

    return toRoleDTO(role);
  }

  /**
   * Returns a role by ID.
   */
  async getById(roleId: RoleId): Promise<RoleDTO> {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toRoleDTO(role);
  }

  /**
   * Returns a role together with its granted permissions.
   */
  async getByIdWithPermissions(roleId: RoleId): Promise<RoleWithPermissionsDTO> {
    const role = await roleRepository.findByIdWithPermissions(roleId);
    if (!role) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toRoleWithPermissionsDTO(role);
  }

  /**
   * Returns a role by its unique key.
   */
  async getByKey(key: string): Promise<RoleDTO> {
    const role = await roleRepository.findByKey(key);
    if (!role) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toRoleDTO(role);
  }

  /**
   * Lists roles using the filters supplied by the caller.
   *
   * No organization/tenant filter is required in the single-college
   * architecture.
   */
  async listRoles(filters: ListRolesFilters, options: ListRolesOptions): Promise<ListRolesResult> {
    const result = await roleRepository.findMany(filters, options);
    return {
      roles: toRoleDTOList(result.roles),
      total: result.total,
    };
  }

  /**
   * Updates the mutable human-facing role label.
   *
   * Role identity remains immutable:
   *
   * - key cannot change
   * - isSystemDefined cannot change
   * - deletedAt is lifecycle-managed
   *
   * System-defined roles are intentionally allowed to have their
   * displayName changed. This permits administrators to use an
   * organization-appropriate human-readable label while preserving the
   * protected machine identity.
   */
  async updateRole(actorUserId: string, roleId: RoleId, input: UpdateRoleInput): Promise<RoleDTO> {
    const existing = await roleRepository.findById(roleId);
    if (!existing) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await roleRepository.update(tx, roleId, input);

      await recordAuditTx(tx, {
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

    roleLogger.info('Role updated', { roleId: existing.id, actorUserId });

    return toRoleDTO(updated);
  }

  /**
   * Archives a role using a reversible soft-delete.
   *
   * System-defined roles cannot be archived because doing so could remove
   * a protected baseline role from the RBAC model.
   */
  async archiveRole(actorUserId: string, roleId: RoleId): Promise<void> {
    const existing = await roleRepository.findById(roleId);
    if (!existing) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }

    if (existing.isSystemDefined) {
      throw ApiError.badRequest('System-defined roles cannot be archived');
    }

    await prisma.$transaction(async (tx) => {
      const archived = await roleRepository.archive(tx, existing.id);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'ARCHIVE',
        entityType: AuditEntityType.ROLE,
        entityId: existing.id,
        oldValue: { deletedAt: existing.deletedAt ? existing.deletedAt.toISOString() : null },
        newValue: { deletedAt: archived.deletedAt ? archived.deletedAt.toISOString() : null },
      });
    });

    roleLogger.info('Role archived', { roleId: existing.id, actorUserId });
  }

  /**
   * Restores an archived role.
   */
  async restoreRole(actorUserId: string, roleId: RoleId): Promise<RoleDTO> {
    const existing = await roleRepository.findById(roleId, true);
    if (!existing) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const restored = await prisma.$transaction(async (tx) => {
      const result = await roleRepository.restore(tx, existing.id);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'RESTORE',
        entityType: AuditEntityType.ROLE,
        entityId: existing.id,
        oldValue: { deletedAt: existing.deletedAt ? existing.deletedAt.toISOString() : null },
        newValue: { deletedAt: null },
      });

      return result;
    });

    roleLogger.info('Role restored', { roleId: existing.id, actorUserId });

    return toRoleDTO(restored);
  }

  // ── Role ↔ Permission ────────────────────────────────────────────

  /**
   * Grants a permission to a role.
   *
   * Role existence is validated before delegation.
   *
   * PermissionService owns:
   *
   * - permission existence validation
   * - duplicate assignment handling
   * - RolePermission persistence
   * - RolePermission audit logging
   *
   * RoleService deliberately does not duplicate those responsibilities.
   */
  async grantPermissionToRole(
    actorUserId: string,
    roleId: RoleId,
    permissionId: PermissionId,
  ): Promise<RolePermission> {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const link = await permissionService.assignToRole(actorUserId, {
      roleId,
      permissionId,
    });

    roleLogger.info('Permission granted to role', {
      roleId,
      permissionId,
      actorUserId,
    });

    return link;
  }

  /**
   * Revokes a permission from a role.
   *
   * Role existence is checked here before delegating the actual
   * RolePermission mutation to PermissionService.
   */

  async revokePermissionFromRole(
    actorUserId: string,
    roleId: RoleId,
    permissionId: PermissionId,
  ): Promise<void> {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }

    await permissionService.revokeFromRole(actorUserId, roleId, permissionId);

    roleLogger.info('Permission revoked from role', {
      roleId,
      permissionId,
      actorUserId,
    });
  }
}

export const roleService = new RoleService();
