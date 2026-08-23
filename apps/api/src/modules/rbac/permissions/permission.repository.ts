// apps/api/src/modules/rbac/permissions/permission.repository.ts

import type { Permission, Prisma, PrismaClient, RolePermission } from '@spark/database/client';

import { prisma } from '../../../lib/prisma.js';
import type { PermissionKey } from '../authorization/authorization.types.js';

import type {
  AssignPermissionToRoleInput,
  CreatePermissionInput,
  ListPermissionsFilters,
  ListPermissionsOptions,
  PermissionId,
  ResolvePermissionsForRolesInput,
  UpdatePermissionInput,
} from './permission.types.js';

/**
 * As with UserRepository, mutating methods take an explicit Prisma
 * transaction client rather than closing over the singleton — so a future
 * permission.service.ts can wrap a create/assign/revoke together with its
 * audit-log write in one `prisma.$transaction(...)`. Read-only methods use
 * the singleton directly.
 */
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Repository-local list result, distinct from permission.types.ts's
 * `ListPermissionsResult` by design, not by oversight. That type is the
 * service/DTO-facing contract; this one is the persistence-facing
 * contract, matching how UserRepository/AuthRepository return raw Prisma
 * models and leave DTO conversion to the mapper/service layer. See
 * permission.mapper.ts (not yet implemented) for where `Permission[]`
 * becomes `PermissionDTO[]`.
 */
export interface PermissionListQueryResult {
  readonly permissions: Permission[];
  readonly total: number;
}

/**
 * The only file allowed to call `prisma.permission.*` / `prisma.rolePermission.*`
 * directly. Persistence access only — this class makes no authorization
 * decisions and performs no role/permission checks; it answers "what's in
 * the catalog" and "what's linked to what," nothing more.
 *
 * Permission is a global, non-organization-scoped table (unlike User/Role),
 * so no method here takes or filters by organizationId.
 */
export class PermissionRepository {
  // ── Permission ─────────────────────────────────────────────────────

  async create(tx: Db, input: CreatePermissionInput): Promise<Permission> {
    return tx.permission.create({
      data: {
        key: `${input.resource}:${input.action}`,
        displayName: input.displayName,
        description: input.description,
      },
    });
  }

  /**
   * Idempotent upsert by the globally unique `key` — the primitive the
   * permission seed script needs. Only `displayName`/`description` are
   * ever updated on conflict; `key` (and therefore resource/action
   * identity) is never rewritten, since existing RolePermission rows may
   * already reference it.
   */
  async upsertByKey(tx: Db, input: CreatePermissionInput): Promise<Permission> {
    const key = `${input.resource}:${input.action}`;
    return tx.permission.upsert({
      where: { key },
      create: { key, displayName: input.displayName, description: input.description },
      update: { displayName: input.displayName, description: input.description },
    });
  }

  async findById(id: PermissionId): Promise<Permission | null> {
    return prisma.permission.findUnique({ where: { id } });
  }

  async findByKey(key: PermissionKey): Promise<Permission | null> {
    return prisma.permission.findUnique({ where: { key } });
  }

  async update(tx: Db, id: PermissionId, input: UpdatePermissionInput): Promise<Permission> {
    return tx.permission.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });
  }

  async findMany(
    filters: ListPermissionsFilters,
    options: ListPermissionsOptions,
  ): Promise<PermissionListQueryResult> {
    const keyFilter: Prisma.PermissionWhereInput =
      filters.resource !== undefined && filters.action !== undefined
        ? { key: `${filters.resource}:${filters.action}` }
        : filters.resource !== undefined
          ? { key: { startsWith: `${filters.resource}:` } }
          : filters.action !== undefined
            ? { key: { endsWith: `:${filters.action}` } }
            : {};

    const where: Prisma.PermissionWhereInput = {
      ...keyFilter,
      ...(filters.search && {
        OR: [
          { key: { contains: filters.search, mode: 'insensitive' } },
          { displayName: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.permission.count({ where }),
    ]);

    return { permissions, total };
  }

  // ── RolePermission ─────────────────────────────────────────────────

  async assignToRole(tx: Db, input: AssignPermissionToRoleInput): Promise<RolePermission> {
    return tx.rolePermission.create({
      data: { roleId: input.roleId, permissionId: input.permissionId },
    });
  }

  async revokeFromRole(tx: Db, roleId: string, permissionId: PermissionId): Promise<void> {
    await tx.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  }

  /**
   * Informational only — the (roleId, permissionId) composite primary key
   * on RolePermission is the actual concurrency guarantee. Callers must
   * not treat `hasAssignment()` followed by `assignToRole()` as atomic;
   * under concurrent calls, rely on the database rejecting the duplicate
   * insert (P2002), not on this check.
   */
  async hasAssignment(roleId: string, permissionId: PermissionId): Promise<boolean> {
    const count = await prisma.rolePermission.count({
      where: { roleId, permissionId },
    });
    return count > 0;
  }

  async findByRoleId(roleId: string): Promise<RolePermission[]> {
    return prisma.rolePermission.findMany({ where: { roleId } });
  }

  /**
   * The permission-resolver's primary read: given a subject's effective
   * role IDs, return the distinct set of Permissions those roles grant.
   * Deduplicates across roles here (a query-shape concern) — it does NOT
   * decide whether any of these permissions apply to a given
   * AuthorizationContext; that's authorization.service.ts's job.
   */
  async resolvePermissionsForRoles(input: ResolvePermissionsForRolesInput): Promise<Permission[]> {
    if (input.roleIds.length === 0) return [];

    const links = await prisma.rolePermission.findMany({
      where: { roleId: { in: [...input.roleIds] } },
      include: { permission: true },
    });

    const byId = new Map<string, Permission>();
    for (const link of links) {
      byId.set(link.permission.id, link.permission);
    }
    return [...byId.values()];
  }
}

export const permissionRepository = new PermissionRepository();
