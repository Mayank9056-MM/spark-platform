// apps/api/src/modules/rbac/assignments/role-assignment.repository.ts

import type { Prisma, PrismaClient, RoleAssignment, ScopeType } from '@spark/database/client';

import { prisma } from '../../../lib/prisma.js';
import type { ScopeContext, UserId } from '../authorization/authorization.types.js';
import type { RoleId } from '../roles/role.types.js';

import type {
  CreateRoleAssignmentInput,
  ListRoleAssignmentsFilters,
  ListRoleAssignmentsOptions,
  RoleAssignmentId,
} from './role-assignment.types.js';

type Db = PrismaClient | Prisma.TransactionClient;

export interface RoleAssignmentListQueryResult {
  readonly roleAssignments: RoleAssignment[];
  readonly total: number;
}

/**
 * Converts the domain ScopeContext into the flat Prisma representation.
 *
 * Domain:
 *
 *   { type: 'COLLEGE' }
 *   { type: 'DEPARTMENT', departmentId }
 *   { type: 'DIVISION', divisionId }
 *
 * Persistence:
 *
 *   COLLEGE      → scopeId = null
 *   DEPARTMENT   → scopeId = departmentId
 *   DIVISION     → scopeId = divisionId
 */
function scopeContextToColumns(scope: ScopeContext): {
  scopeType: ScopeType;
  scopeId: string | null;
} {
  switch (scope.type) {
    case 'COLLEGE':
      return { scopeType: 'COLLEGE', scopeId: null };
    case 'DEPARTMENT':
      return { scopeType: 'DEPARTMENT', scopeId: scope.departmentId };
  }
}

export class RoleAssignmentRepository {
  // ── Create ────────────────────────────────────────────────────────

  /**
   * Creates a role assignment.
   *
   * User and Role foreign keys are enforced directly by the database.
   * Scope existence/ownership validation belongs to scope.service.ts;
   * this repository only persists the already-validated scope structure.
   */
  async create(
    tx: Db,
    grantedByUserId: UserId | null,
    input: CreateRoleAssignmentInput,
  ): Promise<RoleAssignment> {
    const { scopeType, scopeId } = scopeContextToColumns(input.scope);

    return tx.roleAssignment.create({
      data: {
        userId: input.userId,
        roleId: input.roleId,
        scopeType,
        scopeId,
        ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
        validUntil: input.validUntil ?? null,
        grantedByUserId: grantedByUserId ?? null,
      },
    });
  }

  // ── Read ──────────────────────────────────────────────────────────

  async findById(id: RoleAssignmentId): Promise<RoleAssignment | null> {
    return prisma.roleAssignment.findUnique({
      where: { id },
    });
  }

  /**
   * Returns assignments belonging to a user.
   *
   * When activeOnly is true:
   *
   *   validFrom <= now
   *   AND
   *   (validUntil IS NULL OR validUntil > now)
   */
  async findManyByUser(userId: UserId, activeOnly = false): Promise<RoleAssignment[]> {
    const now = new Date();
    return prisma.roleAssignment.findMany({
      where: {
        userId,
        ...(activeOnly && {
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        }),
      },
    });
  }

  /**
   * Returns assignments for a role.
   */
  async findManyByRole(roleId: RoleId, activeOnly = false): Promise<RoleAssignment[]> {
    const now = new Date();
    return prisma.roleAssignment.findMany({
      where: {
        roleId,
        ...(activeOnly && {
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        }),
      },
    });
  }

  /**
   * Lists role assignments using only filters that are meaningful in the
   * single-college architecture.
   */
  async findMany(
    filters: ListRoleAssignmentsFilters,
    options: ListRoleAssignmentsOptions,
  ): Promise<RoleAssignmentListQueryResult> {
    const now = new Date();

    const where: Prisma.RoleAssignmentWhereInput = {
      ...(filters.userId !== undefined && { userId: filters.userId }),
      ...(filters.roleId !== undefined && { roleId: filters.roleId }),
      ...(filters.scopeType !== undefined && {
        scopeType: filters.scopeType,
      }),
      ...(filters.scopeId !== undefined && { scopeId: filters.scopeId }),
      ...(filters.activeOnly && {
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      }),
    };

    const [roleAssignments, total] = await Promise.all([
      prisma.roleAssignment.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.roleAssignment.count({ where }),
    ]);

    return { roleAssignments, total };
  }

  // ── Revoke (lifecycle, not deletion) ────────────────────────────────

  /**
   * Revokes an assignment by setting validUntil.
   *
   * The assignment row is intentionally retained so the RBAC history
   * remains auditable.
   */
  async revoke(tx: Db, id: RoleAssignmentId, validUntil: Date): Promise<RoleAssignment | null> {
    const result = await tx.roleAssignment.updateMany({
      where: { id },
      data: { validUntil },
    });

    if (result.count === 0) {
      return null;
    }

    return tx.roleAssignment.findUnique({ where: { id } });
  }

  // ── Duplicate-assignment fast-path check ────────────────────────────

  /**
   * Best-effort check for an already-active assignment.
   *
   * This is NOT a concurrency guarantee. If duplicate active assignments
   * must be impossible under concurrent requests, the database schema
   * needs an appropriate uniqueness strategy or the service must use
   * another transactional serialization strategy.
   */
  async existsActive(userId: UserId, roleId: RoleId, scope: ScopeContext): Promise<boolean> {
    const { scopeType, scopeId } = scopeContextToColumns(scope);
    const now = new Date();

    const count = await prisma.roleAssignment.count({
      where: {
        userId,
        roleId,
        scopeType,
        scopeId,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
    });
    return count > 0;
  }
}

export const roleAssignmentRepository = new RoleAssignmentRepository();
