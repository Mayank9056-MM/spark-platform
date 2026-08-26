// apps/api/src/modules/rbac/roles/role.repository.ts

import type {
  Permission,
  Prisma,
  PrismaClient,
  Role,
  RolePermission,
} from '@spark/database/client';

import { prisma } from '../../../lib/prisma.js';

import type {
  CreateRoleInput,
  ListRolesFilters,
  ListRolesOptions,
  RoleId,
  UpdateRoleInput,
} from './role.types.js';

/**
 * As with UserRepository/PermissionRepository, mutating methods take an
 * explicit Prisma transaction client rather than closing over the
 * singleton — so role.service.ts can wrap a role mutation together with
 * its audit-log write (and, where relevant, a RolePermission mutation) in
 * one `prisma.$transaction(...)`. Read-only methods use the singleton.
 */
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Raw persistence shape for a Role with its granted permissions attached
 * via Prisma `include` — NOT a DTO. `RoleWithPermissionsDTO` (role.types.ts)
 * is what role.mapper.ts produces from this shape.
 */
export type RoleWithPermissionsRecord = Role & {
  rolePermissions: (RolePermission & { permission: Permission })[];
};

export interface RoleListQueryResult {
  readonly roles: Role[];
  readonly total: number;
}

/**
 * The only file allowed to call `prisma.role.*` directly (and the
 * Role-centric slice of `prisma.rolePermission.*` — see
 * findByIdWithPermissions). Persistence access only: no authorization
 * decisions, no DTO mapping, no audit orchestration.
 *
 * Role is global within this single-college deployment — there is no
 * tenant boundary left to scope by.
 */
export class RoleRepository {
  // ── Role ───────────────────────────────────────────────────────────

  /**
   * Ordinary role creation. Always produces `isSystemDefined: false` —
   * CreateRoleInput has no such field, so there is nothing for a caller
   * to set here even in principle.
   */
  async create(tx: Db, input: CreateRoleInput): Promise<Role> {
    return tx.role.create({
      data: {
        key: input.key,
        displayName: input.displayName,
        // isSystemDefined intentionally omitted — schema defaults to false.
      },
    });
  }

  /**
   * Narrowly scoped, trusted-caller-only primitive for seed/bootstrap
   * logic that must provision a protected role (e.g. the college's
   * initial "admin" role). Deliberately NOT reachable from ordinary
   * role-creation flows — role.service.ts must not expose this to any
   * HTTP-facing "create role" operation. Exists as its own method, rather
   * than an `isSystemDefined` parameter on `create()`, specifically so
   * that nothing can accidentally wire ordinary input through to it.
   */
  async createSystemRole(tx: Db, input: CreateRoleInput): Promise<Role> {
    return tx.role.create({
      data: {
        key: input.key,
        displayName: input.displayName,
        isSystemDefined: true,
      },
    });
  }

  /**
   * Read convention matches UserRepository.findById: flat `where` fields
   * (not a composite unique selector) so `deletedAt: null` can be
   * combined cleanly. Excludes soft-deleted roles by default.
   */
  async findById(id: RoleId, includeDeleted = false): Promise<Role | null> {
    return prisma.role.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  /**
   * Role key is globally unique — a single-argument lookup is correct,
   * not a shortcut.
   */
  async findByKey(key: string, includeDeleted = false): Promise<Role | null> {
    return prisma.role.findFirst({
      where: {
        key,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async existsByKey(key: string): Promise<boolean> {
    const count = await prisma.role.count({
      where: { key, deletedAt: null },
    });
    return count > 0;
  }

  /**
   * Plain `id` selector. Only `displayName` is ever written — the only
   * field `UpdateRoleInput` exposes. If `id` doesn't match an existing
   * row, Prisma throws P2025 — mapped to a clean 404 by the Prisma error
   * mapper.
   */
  async update(tx: Db, id: RoleId, input: UpdateRoleInput): Promise<Role> {
    return tx.role.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined && { displayName: input.displayName }),
      },
    });
  }

  /**
   * Soft delete only — never a physical DELETE, matching the schema's
   * `deletedAt` field and the project's established soft-delete
   * convention (see UserRepository.archive). Does not decide whether
   * system-defined roles may be archived; that policy boundary belongs
   * to role.service.ts, which has the business context this repository
   * deliberately doesn't.
   */
  async archive(tx: Db, id: RoleId): Promise<Role> {
    return tx.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(tx: Db, id: RoleId): Promise<Role> {
    return tx.role.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Same count+findMany-in-parallel shape as UserRepository.findMany.
   * `search` matches against key/displayName; excludes soft-deleted
   * roles by default (no `includeDeleted` param — role.types.ts's
   * ListRolesFilters has no such flag, so none is fabricated here).
   */
  async findMany(
    filters: ListRolesFilters,
    options: ListRolesOptions,
  ): Promise<RoleListQueryResult> {
    const where: Prisma.RoleWhereInput = {
      deletedAt: null,
      ...(filters.isSystemDefined !== undefined && { isSystemDefined: filters.isSystemDefined }),
      ...(filters.search && {
        OR: [
          { key: { contains: filters.search, mode: 'insensitive' } },
          { displayName: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.role.count({ where }),
    ]);

    return { roles, total };
  }

  // ── Role + granted permissions (Role-centric composite read) ───────

  /**
   * The one RolePermission-adjacent method owned here rather than by
   * permission.repository.ts: that repository's methods start from a
   * permission or a set of role IDs, never from "fetch one Role together
   * with what it grants." Excludes soft-deleted roles by default, same
   * as findById. Returns the raw Prisma relation payload — role.mapper.ts
   * is responsible for turning this into RoleWithPermissionsDTO.
   */
  async findByIdWithPermissions(
    id: RoleId,
    includeDeleted = false,
  ): Promise<RoleWithPermissionsRecord | null> {
    return prisma.role.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }
}

export const roleRepository = new RoleRepository();
