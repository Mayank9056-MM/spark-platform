import type { Prisma, User } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

import type {
  CreateUserInput,
  ListUsersFilters,
  ListUsersOptions,
  ListUsersResult,
  UpdateUserInput,
} from './user.types.js';

export class UserRepository {
  async create(input: CreateUserInput): Promise<User> {
    return prisma.user.create({
      data: {
        organizationId: input.organizationId,
        email: input.email,
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
      where: { organizationId, email: email.toLowerCase() },
    });
    return count > 0;
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    return prisma.user.update({
      where: { id },
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
   */
  async archive(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { status: 'DEACTIVATED', deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
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
