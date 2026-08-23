// apps/api/src/modules/rbac/permissions/permission.service.ts

import type { RolePermission } from '@spark/database/client';
import { createChildLogger } from '@spark/shared/logger';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import type { OrganizationId, PermissionKey } from '../authorization/authorization.types.js';

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

const permissionLogger = createChildLogger({ component: 'permission' });

/**
 * Business-logic layer for the Permission domain. Answers "what business
 * operation is valid" — never "is this user allowed to do X" (that's
 * authorization.service.ts) and never "what exists in the database"
 * directly (that's permission.repository.ts).
 *
 * Permission is a global catalog with no organizationId; Role/RoleAssignment
 * carry the tenant scoping. This service never introduces one.
 *
 * DTO boundary: every method that represents a service/API-facing
 * Permission read/write now returns `PermissionDTO`/`ListPermissionsResult`,
 * never a raw Prisma `Permission`. permission.repository.ts remains
 * persistence-only (still returns raw Prisma models); this service is the
 * only place that calls permission.mapper.ts to cross that boundary.
 * RolePermission-shaped operations are a deliberate, documented exception
 * — see assignToRole()/revokeFromRole()/resolvePermissionsForRoles() below.
 * assignToRole()/revokeFromRole() take `organizationId` as a trusted,
 * caller-supplied parameter (role.service.ts resolves it from
 * authenticated/service context) solely to attribute their RolePermission
 * audit records to the correct tenant — Permission/RolePermission
 * themselves remain organizationId-free, global/join records.
 */
export class PermissionService {
  // ── Permission CRUD ───────────────────────────────────────────────

  /**
   * Accepts any (resource, action) pair the type system allows
   * (AuthorizationResource × AuthorizationAction), not only entries
   * already present in PERMISSION_CATALOG. The catalog documents what's
   * currently implemented and drives seeding; it isn't treated as an
   * exhaustive allowlist here, since the schema/architecture don't
   * require that and future modules will legitimately add permissions
   * outside today's catalog. Rejecting non-catalog permissions would be
   * a policy decision this service isn't positioned to make.
   *
   * No transaction here: this is a single write with no matching audit
   * entity type available yet (see file-level note) — wrapping one
   * atomic insert in `prisma.$transaction` would add nothing.
   */
  async createPermission(input: CreatePermissionInput): Promise<PermissionDTO> {
    const created = await permissionRepository.create(prisma, input);
    permissionLogger.info('Permission created', { permissionId: created.id, key: created.key });
    return toPermissionDTO(created);
  }

  /**
   * Idempotent upsert for seed/bootstrap. Identity (key) is preserved by
   * construction — permissionRepository.upsertByKey derives `key` from
   * resource+action and only ever touches displayName/description on
   * conflict, never the key itself.
   *
   * No current caller of this method exists elsewhere in the inspected
   * codebase (no seed script wiring it up yet), so there is no established
   * "raw Prisma record" contract to preserve. Per the task's guidance to
   * prefer a clean DTO-facing contract absent evidence to the contrary,
   * this now returns `PermissionDTO` for consistency with createPermission.
   * If a future seed/bootstrap script needs the raw Prisma row (e.g. to
   * chain a transaction using `created.id` alongside other raw writes),
   * `permissionRepository.upsertByKey` remains directly available to call
   * without going through this service method.
   */
  async upsertPermission(input: CreatePermissionInput): Promise<PermissionDTO> {
    const permission = await permissionRepository.upsertByKey(prisma, input);
    permissionLogger.info('Permission upserted', {
      permissionId: permission.id,
      key: permission.key,
    });
    return toPermissionDTO(permission);
  }

  async getById(id: PermissionId): Promise<PermissionDTO> {
    const permission = await permissionRepository.findById(id);
    if (!permission) {
      throw ApiError.notFound('Permission not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toPermissionDTO(permission);
  }

  async getByKey(key: PermissionKey): Promise<PermissionDTO> {
    const permission = await permissionRepository.findByKey(key);
    if (!permission) {
      throw ApiError.notFound('Permission not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toPermissionDTO(permission);
  }

  /**
   * Now returns the service/API-facing `ListPermissionsResult`
   * (permission.types.ts) instead of the repository's persistence-shaped
   * `PermissionListQueryResult`. One repository query + one count query,
   * exactly as before — mapping is pure and adds no additional database
   * access.
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
   * Only displayName/description are mutable — UpdatePermissionInput's
   * shape already enforces this at the type level, so there is no
   * updateKey()/changeResource() to accidentally expose here.
   *
   * Uses `permissionRepository.findById` directly for the existence check
   * rather than `this.getById()`: getById() now returns a mapped
   * `PermissionDTO`, and mapping a record that's about to be discarded
   * (only its existence matters here) would be pure waste before the
   * write that follows.
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
   * Does not verify roleId refers to an existing Role by itself — that
   * tenant-ownership check (organizationId + roleId identify an existing
   * Role) is role.service.ts's responsibility, performed via
   * `roleRepository.findById(organizationId, roleId)` BEFORE this method
   * is called; RoleService is the only caller that has that trusted
   * context. This method still does not duplicate that check — the
   * database FK on RolePermission.roleId remains the persistence-level
   * backstop; a nonexistent roleId surfaces as Prisma P2003, mapped to
   * 400 FOREIGN_KEY_VIOLATION by the existing global mapPrismaError.
   *
   * `organizationId` is a trusted parameter supplied by the caller
   * (RoleService, which resolved it from authenticated/service context
   * before ever reaching this method) — it is used ONLY to attribute the
   * audit record to the correct tenant, never to filter/validate the
   * RolePermission mutation itself (Permission is global; RolePermission
   * has no organizationId column of its own). It must never originate
   * from client-controlled request input passed straight through.
   *
   * hasAssignment() is used only as a fast-path duplicate check, mirroring
   * UserService.createUser's existsByEmail-then-create pattern: it is NOT
   * the concurrency guarantee. Under a genuine race, the DB's
   * (roleId, permissionId) composite primary key rejects the duplicate
   * insert with P2002, mapped globally to 409 DUPLICATE_ENTRY.
   *
   * Wrapped in a transaction because this is a security-sensitive,
   * state-changing RBAC mutation — same class of operation as
   * UserService's archive/restore — so the grant and its audit record
   * must commit or roll back together (recordAuditTx, not recordAudit).
   * This remains the single, authoritative audit write for the
   * RolePermission mutation — RoleService does not record a second one.
   *
   * Return type deliberately stays `Promise<RolePermission>` (the raw
   * Prisma join record), NOT a DTO. permission.types.ts defines no
   * RolePermission-facing DTO (its `RolePermissionLink` is a distinct,
   * pre-existing type this task was not asked to wire in), and inventing
   * one is explicitly out of scope. Documented technical debt, not an
   * oversight — see role.service.ts's grantPermissionToRole() for the
   * matching note on its call site.
   */
  async assignToRole(
    actorUserId: string,
    organizationId: OrganizationId,
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
        organizationId,
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
   * No pre-existence check before deleting — mirrors the project's
   * existing convention (e.g. UserRepository.update/archive relying on
   * their composite `where` to throw P2025 on a missing row, mapped
   * globally to 404 RECORD_NOT_FOUND) rather than inventing a distinct
   * idempotent-no-op semantic for this one relationship. Tenant ownership
   * of `roleId` is validated by role.service.ts before this is called,
   * same as assignToRole() — see that method's doc comment.
   *
   * `organizationId` is trusted caller-supplied context, used only for
   * audit attribution — same contract as assignToRole().
   *
   * Stays `Promise<void>` — unchanged, no mapper involved. This remains
   * the single, authoritative audit write for the revoke.
   */
  async revokeFromRole(
    actorUserId: string,
    organizationId: OrganizationId,
    roleId: string,
    permissionId: PermissionId,
  ): Promise<void> {
    const permission = await this.getById(permissionId);

    await prisma.$transaction(async (tx) => {
      await permissionRepository.revokeFromRole(tx, roleId, permissionId);

      await recordAuditTx(tx, {
        organizationId,
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
   * Pure resolution read — returns the distinct Permissions granted by
   * the given role IDs. Delegates entirely to the repository, which
   * already avoids N+1 by fetching RolePermission with a single
   * `include: { permission: true }` query and deduplicating client-side.
   * This method makes no judgment about whether any of these permissions
   * apply to a given AuthorizationContext — that's authorization.service.ts.
   *
   * Changed to `Promise<PermissionDTO[]>`: the only plausible caller,
   * `authorization/permission-resolver.ts`, is currently empty — there is
   * no existing consumer depending on the raw `Permission[]` shape, so
   * this safely adopts the preferred DTO-facing contract per the task's
   * guidance (section 13) rather than leaving it persistence-shaped
   * "just in case."
   */
  async resolvePermissionsForRoles(
    input: ResolvePermissionsForRolesInput,
  ): Promise<PermissionDTO[]> {
    const permissions = await permissionRepository.resolvePermissionsForRoles(input);
    return toPermissionDTOList(permissions);
  }
}

export const permissionService = new PermissionService();
