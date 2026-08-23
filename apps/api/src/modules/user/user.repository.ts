import type { Prisma, PrismaClient, User } from '@spark/database/client';

import { normalizeEmail } from '../../lib/email.js';
import { prisma } from '../../lib/prisma.js';

import type {
  CreateUserInput,
  ListUsersFilters,
  ListUsersOptions,
  ListUsersResult,
  UpdateUserInput,
} from './user.types.js';

/**
 * Every mutating method below takes a Prisma transaction client (`tx`) as
 * an explicit parameter rather than closing over the module-level `prisma`
 * singleton. This lets user.service.ts wrap create/update/archive/restore
 * + their audit write in one `prisma.$transaction(...)` (Phase 21, Phase
 * 10 "transactional auditing") — a repository method that always used the
 * singleton client could never participate in a caller's transaction.
 * Read-only methods (findById, existsByEmail, findMany) still default to
 * the singleton since there's nothing to keep atomic with a read.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export class UserRepository {
  async create(tx: Db, input: CreateUserInput): Promise<User> {
    return tx.user.create({
      data: {
        organizationId: input.organizationId,
        email: normalizeEmail(input.email),
        firstName: input.firstName,
        middleName: input.middleName ?? null,
        lastName: input.lastName,
        // passwordHash intentionally omitted — schema defaults to null.
        // status intentionally omitted — schema defaults to PENDING_ACTIVATION.
        // The User module NEVER sets either of these directly; that's
        // Auth's job via setPasswordHash(), called only from activation/
        // reset flows.
      },
    });
  }

  async findById(organizationId: string, id: string, includeDeleted = false): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        id,
        organizationId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async existsByEmail(organizationId: string, email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { organizationId, email: normalizeEmail(email) },
    });
    return count > 0;
  }

  /**
   * `organizationId` + `id` together, resolved through the
   * `users_organizationId_id_key` composite unique constraint — the same
   * single atomic query the brief asks for (Phase 2), rather than a bare
   * `where: { id }` that trusts an earlier, separate existence check. If a
   * caller passes an organizationId/id pair that doesn't exist together
   * (wrong tenant, wrong id, or both), Prisma throws P2025 — mapped to a
   * clean 404 by the Prisma error mapper — instead of silently updating a
   * row across a tenant boundary.
   */
  async update(tx: Db, organizationId: string, id: string, input: UpdateUserInput): Promise<User> {
    return tx.user.update({
      where: { organizationId_id: { organizationId, id } },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.middleName !== undefined && { middleName: input.middleName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      },
    });
  }

  /**
   * Reversible soft-delete — sets status to DEACTIVATED, not ARCHIVED.
   * Per the Identity domain design, ARCHIVED is a terminal, GDPR-erasure
   * state that destroys PII and can never be undone. This "archive"
   * action (with a matching restore()) is the ordinary offboarding case
   * — deliberately using DEACTIVATED so restore() remains meaningful.
   * True ARCHIVED/erasure is a separate, not-yet-built endpoint.
   *
   * Same organizationId+id atomic-where reasoning as update() above.
   */
  async archive(tx: Db, organizationId: string, id: string): Promise<User> {
    return tx.user.update({
      where: { organizationId_id: { organizationId, id } },
      data: { status: 'DEACTIVATED', deletedAt: new Date() },
    });
  }

  async restore(tx: Db, organizationId: string, id: string): Promise<User> {
    return tx.user.update({
      where: { organizationId_id: { organizationId, id } },
      data: { status: 'ACTIVE', deletedAt: null },
    });
  }

  async findMany(filters: ListUsersFilters, options: ListUsersOptions): Promise<ListUsersResult> {
    const where: Prisma.UserWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.search && {
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  // ── RBAC extension points — intentionally unimplemented ──────────
  // async findActiveRoleAssignments(userId: string): Promise<RoleAssignment[]>
  // async hasRole(userId: string, roleKey: string, scope: ScopeContext): Promise<boolean>
  // Adding these later requires zero changes to existing methods above —
  // that's the point of preparing the extension point without building it.
}

export const userRepository = new UserRepository();
