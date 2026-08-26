// apps/api/src/modules/rbac/permissions/permission.service.ts

import type { RolePermission } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import type { PermissionKey } from '../authorization/authorization.types.js';

import { toPermissionDTO, toPermissionDTOList } from './permission.mapper.js';
import { permissionRepository } from './permission.repository.js';
import type {
  AssignPermissionToRoleInput,
  CreatePermissionInput,
  ListPermissionsFilters,
  ListPermissionsOptions,
  ListPermissionsResult,
  PermissionDTO,
  PermissionId,
  ResolvePermissionsForRolesInput,
  UpdatePermissionInput,
} from './permission.types.js';

import { permissionLogger } from '@/lib/logger.js';

/**
 * Business-logic layer for the Permission domain.
 *
 * This service answers:
 * "Is this Permission operation valid according to the Permission domain?"
 *
 * It does not:
 *
 * - perform authorization decisions
 * - resolve user roles
 * - resolve scope access
 * - access Prisma directly for persistence
 * - perform HTTP validation
 *
 * Permission is a global capability catalog in the single-college
 * architecture. Permissions are not owned by a college, department,
 * division, organization, user, or role.
 *
 * Scope is applied through RoleAssignment, not Permission.
 *
 * DTO boundary:
 * Permission reads exposed by this service are converted through
 * permission.mapper.ts. Persistence remains inside permission.repository.ts.
 *
 * RolePermission relationship operations intentionally return the raw
 * Prisma join record because the current domain does not define a
 * dedicated RolePermission DTO.
 */
export class PermissionService {
  // ── Permission CRUD ───────────────────────────────────────────────

  /**
   * Creates a permission from a resource/action pair.
   *
   * The permission catalog describes currently implemented capabilities,
   * but it is not treated as an exhaustive runtime allowlist. Future
   * modules may introduce additional valid AuthorizationResource /
   * AuthorizationAction combinations.
   */
  async createPermission(input: CreatePermissionInput): Promise<PermissionDTO> {
    const created = await permissionRepository.create(prisma, input);
    permissionLogger.info('Permission created', { permissionId: created.id, key: created.key });
    return toPermissionDTO(created);
  }

  /**
   * Idempotent permission upsert used by seed/bootstrap operations.
   *
   * The key is derived from resource + action and remains immutable.
   * Only displayName and description are updated when the key already
   * exists.
   */
  async upsertPermission(input: CreatePermissionInput): Promise<PermissionDTO> {
    const permission = await permissionRepository.upsertByKey(prisma, input);
    permissionLogger.info('Permission upserted', {
      permissionId: permission.id,
      key: permission.key,
    });
    return toPermissionDTO(permission);
  }

  /**
   * Returns a permission by ID.
   */
  async getById(id: PermissionId): Promise<PermissionDTO> {
    const permission = await permissionRepository.findById(id);
    if (!permission) {
      throw ApiError.notFound('Permission not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toPermissionDTO(permission);
  }

  /**
   * Returns a permission by its globally unique key.
   */
  async getByKey(key: PermissionKey): Promise<PermissionDTO> {
    const permission = await permissionRepository.findByKey(key);
    if (!permission) {
      throw ApiError.notFound('Permission not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toPermissionDTO(permission);
  }

  /**
   * Lists permissions using the persistence repository and maps the
   * resulting records into service/API DTOs.
   */
  async listPermissions(
    filters: ListPermissionsFilters,
    options: ListPermissionsOptions,
  ): Promise<ListPermissionsResult> {
    const result = await permissionRepository.findMany(filters, options);
    return {
      permissions: toPermissionDTOList(result.permissions),
      total: result.total,
    };
  }

  /**
   * Updates mutable permission metadata.
   *
   * Permission identity is immutable. The key/resource/action identity
   * cannot be changed through this service.
   */
  async updatePermission(id: PermissionId, input: UpdatePermissionInput): Promise<PermissionDTO> {
    const existing = await permissionRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Permission not found', ErrorCode.RECORD_NOT_FOUND);
    }
    const updated = await permissionRepository.update(prisma, id, input);
    permissionLogger.info('Permission updated', { permissionId: id });
    return toPermissionDTO(updated);
  }

  // ── Role ↔ Permission ────────────────────────────────────────────

  /**
   * Grants a permission to a role.
   *
   * Single-college architecture:
   *
   * There is no organization/tenant identifier involved in this operation.
   *
   * Role ownership and validity are established by the Role domain before
   * this operation is invoked. The database foreign keys provide the
   * persistence-level guarantee that the referenced Role and Permission
   * exist.
   *
   * The duplicate check is only an early failure optimization. The
   * composite primary key on RolePermission remains the authoritative
   * concurrency guarantee.
   *
   * The RolePermission mutation and its audit record are committed
   * atomically in one transaction.
   */
  async assignToRole(
    actorUserId: string,
    input: AssignPermissionToRoleInput,
  ): Promise<RolePermission> {
    const permission = await this.getById(input.permissionId);

    const alreadyAssigned = await permissionRepository.hasAssignment(
      input.roleId,
      input.permissionId,
    );
    if (alreadyAssigned) {
      throw ApiError.conflict(
        'This permission is already assigned to the role',
        ErrorCode.DUPLICATE_ENTRY,
      );
    }

    const link = await prisma.$transaction(async (tx) => {
      const created = await permissionRepository.assignToRole(tx, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'PERMISSION_CHANGED',
        entityType: AuditEntityType.ROLE,
        entityId: input.roleId,
        newValue: { grantedPermissionKey: permission.key },
      });

      return created;
    });

    permissionLogger.info('Permission assigned to role', {
      roleId: input.roleId,
      permissionId: input.permissionId,
      actorUserId,
    });

    return link;
  }

  /**
   * Revokes a permission from a role.
   *
   * The relationship is physically removed while the audit record
   * preserves the historical action.
   *
   * No organization/tenant context is required in the single-college
   * architecture.
   */
  async revokeFromRole(
    actorUserId: string,
    roleId: string,
    permissionId: PermissionId,
  ): Promise<void> {
    const permission = await this.getById(permissionId);

    await prisma.$transaction(async (tx) => {
      await permissionRepository.revokeFromRole(tx, roleId, permissionId);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'PERMISSION_CHANGED',
        entityType: AuditEntityType.ROLE,
        entityId: roleId,
        oldValue: { revokedPermissionKey: permission.key },
      });
    });

    permissionLogger.info('Permission revoked from role', { roleId, permissionId, actorUserId });
  }

  /**
   * Resolves the distinct permissions granted by the supplied role IDs.
   *
   * This method only resolves capability definitions.
   *
   * It does not determine whether the permissions are effective for a
   * specific user, action, resource, or scope. That responsibility belongs
   * to the authorization layer.
   */
  async resolvePermissionsForRoles(
    input: ResolvePermissionsForRolesInput,
  ): Promise<PermissionDTO[]> {
    const permissions = await permissionRepository.resolvePermissionsForRoles(input);
    return toPermissionDTOList(permissions);
  }
}

export const permissionService = new PermissionService();
