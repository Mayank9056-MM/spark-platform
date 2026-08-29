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
 * Prisma client type accepted by repository methods.
 *
 * Mutating methods receive an explicit transaction client so the service
 * layer can atomically combine persistence changes with audit records.
 *
 * Read-only methods use the shared Prisma singleton.
 */
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Persistence-facing result for permission listing.
 *
 * This deliberately contains raw Prisma Permission models. DTO conversion
 * belongs to permission.mapper.ts and service-layer response shaping.
 */
export interface PermissionListQueryResult {
  readonly permissions: Permission[];
  readonly total: number;
}

/**
 * Persistence boundary for the Permission domain.
 *
 * This repository:
 *
 * - performs Permission persistence
 * - performs RolePermission persistence
 * - performs permission catalog queries
 * - performs permission resolution for role IDs
 *
 * It does NOT:
 *
 * - make authorization decisions
 * - determine whether a user may perform an action
 * - validate roles
 * - validate scopes
 * - write audit records
 * - contain HTTP concerns
 *
 * Permissions are global capability definitions in the single-college
 * architecture. They do not contain organization, college, department,
 * division, or tenant context.
 */
export class PermissionRepository {
  // ── Permission ─────────────────────────────────────────────────────

  /**
   * Creates a Permission from its canonical resource/action identity.
   *
   * The permission key is always derived from resource + action rather
   * than accepted as a separately supplied value.
   */
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
   * Idempotent permission bootstrap/upsert.
   *
   * Permission.key is the stable global identity.
   *
   * Existing keys retain their identity while human-facing metadata may
   * be updated during seeding/bootstrap.
   */
  async upsertByKey(tx: Db, input: CreatePermissionInput): Promise<Permission> {
    const key = `${input.resource}:${input.action}`;
    return tx.permission.upsert({
      where: { key },
      create: { key, displayName: input.displayName, description: input.description },
      update: { displayName: input.displayName, description: input.description },
    });
  }

  /**
   * Finds a permission by its primary identifier.
   */
  async findById(id: PermissionId): Promise<Permission | null> {
    return prisma.permission.findUnique({ where: { id } });
  }

  /**
   * Finds a permission by its globally unique key.
   */
  async findByKey(key: PermissionKey): Promise<Permission | null> {
    return prisma.permission.findUnique({ where: { key } });
  }

  /**
   * Updates mutable permission metadata.
   *
   * Permission identity (`key`, resource, action) is immutable.
   */
  async update(tx: Db, id: PermissionId, input: UpdatePermissionInput): Promise<Permission> {
    return tx.permission.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });
  }

  /**
   * Lists permissions using catalog filters and pagination.
   */
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

  /**
   * Grants a Permission to a Role.
   *
   * The database composite primary key on (roleId, permissionId) is the
   * authoritative duplicate/concurrency guarantee.
   */
  async assignToRole(tx: Db, input: AssignPermissionToRoleInput): Promise<RolePermission> {
    return tx.rolePermission.create({
      data: { roleId: input.roleId, permissionId: input.permissionId },
    });
  }

  /**
   * Revokes a Permission from a Role.
   *
   * The database composite key identifies the relationship uniquely.
   */
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

  /**
   * Returns all Permission relationships assigned to a Role.
   *
   * This returns the raw RolePermission persistence records.
   */
  async findByRoleId(roleId: string): Promise<RolePermission[]> {
    return prisma.rolePermission.findMany({ where: { roleId } });
  }

  /**
   * Resolves the distinct Permissions granted by a set of Role IDs.
   *
   * This is a persistence/query concern only. It does not decide whether
   * those permissions are effective for a user, resource, action, or scope.
   *
   * Deduplication happens by Permission ID so a permission granted through
   * multiple roles is returned only once.
   */
  async resolvePermissionsForRoles(input: ResolvePermissionsForRolesInput): Promise<Permission[]> {
    if (input.roleIds.length === 0) {
      return [];
    }

    const links = await prisma.rolePermission.findMany({
      where: {
        roleId: {
          in: [...input.roleIds],
        },
      },
      include: {
        permission: true,
      },
    });

    const permissionsById = new Map<string, Permission>();

    for (const link of links) {
      permissionsById.set(link.permission.id, link.permission);
    }

    return [...permissionsById.values()];
  }

  /**
   * Resolves the Permissions granted by a set of Role IDs, grouped by the
   * role that grants each permission — as opposed to
   * resolvePermissionsForRoles, which deduplicates into a single flat
   * list and discards which role contributed which permission.
   *
   * This exists specifically for authorization.service.ts's requirement
   * that a requested permission and a requested scope must be evaluated
   * from the SAME role assignment: combining a permission granted by one
   * role with a scope granted by a different role would be a security
   * defect. Grouping by roleId lets the caller answer "does THIS role
   * grant the requested permission" without a second query per role.
   *
   * Performs the same single RolePermission join query as
   * resolvePermissionsForRoles, so no additional round trips are
   * introduced. A permission cannot appear twice for the same role — the
   * composite primary key on RolePermission (roleId, permissionId)
   * prevents duplicate rows — so no per-role deduplication step is
   * needed beyond the natural shape of the join.
   */
  async resolvePermissionsForRolesGrouped(
    input: ResolvePermissionsForRolesInput,
  ): Promise<Map<string, Permission[]>> {
    if (input.roleIds.length === 0) {
      return new Map();
    }

    const links = await prisma.rolePermission.findMany({
      where: {
        roleId: {
          in: [...input.roleIds],
        },
      },
      include: {
        permission: true,
      },
    });

    const permissionsByRole = new Map<string, Permission[]>();

    for (const link of links) {
      const existing = permissionsByRole.get(link.roleId);
      if (existing) {
        existing.push(link.permission);
      } else {
        permissionsByRole.set(link.roleId, [link.permission]);
      }
    }

    return permissionsByRole;
  }

  /**
   * Idempotent grant of a Permission to a Role, keyed on the composite
   * (roleId, permissionId) primary key already defined on RolePermission.
   *
   * Unlike `assignToRole` (a plain insert, used by the HTTP-facing
   * grant-permission flow where a duplicate grant should surface to the
   * caller as a 409 Conflict), this is the upsert-shaped primitive for
   * idempotent bootstrap/seed code: running it any number of times
   * converges to the same granted relationship, never throwing on an
   * already-existing grant and never creating a duplicate row. There is
   * no mutable data on RolePermission besides `createdAt` (set once, on
   * first insert) — a repeat call past the first successful grant is a
   * true no-op.
   */
  async upsertRoleGrant(
    tx: Db,
    roleId: string,
    permissionId: PermissionId,
  ): Promise<RolePermission> {
    return tx.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    });
  }
}

export const permissionRepository = new PermissionRepository();
