import type { User } from '@spark/database';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { userLogger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';
import { authService } from '../auth/index.js';

import { userRepository } from './user.repository.js';
import type {
  CreateUserInput,
  ListUsersFilters,
  ListUsersOptions,
  ListUsersResult,
  UpdateUserInput,
} from './user.types.js';

export class UserService {
  /**
   * Cross-module boundary in action: this creates the identity and hands
   * off to Auth for activation-token issuance, but never touches a
   * password or generates a token itself — that stays entirely inside
   * auth.service.ts.
   *
   * User creation + its audit record run inside one transaction (Phase 10:
   * "business operation + audit = atomic transaction" for security-
   * sensitive/state-changing operations — creating an identity qualifies).
   * activationToken issuance intentionally happens AFTER the transaction
   * commits, not inside it: issueActivationToken writes to
   * verification_tokens, a table with no relation to whether the audit
   * write succeeds, and keeping it out of the transaction keeps the
   * transaction's write-set minimal and fast.
   */
  async createUser(
    actorUserId: string,
    input: Omit<CreateUserInput, 'organizationId'>,
  ): Promise<{ user: User; activationToken: string }> {
    const emailTaken = await userRepository.existsByEmail(input.email);
    if (emailTaken) {
      throw ApiError.conflict('A user with this email already exists', ErrorCode.DUPLICATE_ENTRY);
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await userRepository.create(tx, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.USER,
        entityId: created.id,
        newValue: { email: created.email, status: created.status },
      });

      return created;
    });
    /**
     * existsByEmail() is intentionally only a fast-path check.
     *
     * Concurrent requests can still race between the existence check and
     * INSERT. The database unique constraint remains the source of truth
     * and any resulting Prisma P2002 must be mapped to a 409 response.
     */
    const activationToken = await authService.issueActivationToken(user.id);

    userLogger.info('User created', { userId: user.id, actorUserId });

    return { user, activationToken };
  }

  /**
   * Returns a user by ID.
   *
   * The application is single-college, so no organizationId is required.
   */
  async getById(id: string): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  /**
   * Lists users in the single-college application.
   */
  async listUsers(filters: ListUsersFilters, options: ListUsersOptions): Promise<ListUsersResult> {
    return userRepository.findMany(filters, options);
  }

  /**
   * Updates mutable user profile fields.
   *
   * actorUserId identifies the authenticated actor.
   * targetUserId identifies the user being modified.
   */
  async updateUser(
    actorUserId: string,
    targetUserId: string,
    input: UpdateUserInput,
  ): Promise<User> {
    const existing = await this.getById(targetUserId);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await userRepository.update(tx, existing.id, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.USER,
        entityId: existing.id,
        oldValue: {
          firstName: existing.firstName,
          middleName: existing.middleName,
          lastName: existing.lastName,
          avatarUrl: existing.avatarUrl,
        },
        newValue: {
          ...(input.firstName !== undefined && { firstName: input.firstName }),
          ...(input.middleName !== undefined && { middleName: input.middleName }),
          ...(input.lastName !== undefined && { lastName: input.lastName }),
          ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        },
      });

      return result;
    });

    userLogger.info('User updated', { userId: existing.id, actorUserId });

    return updated;
  }

  /**
   * Reversibly archives a user.
   *
   * A user cannot archive their own account.
   */
  async archiveUser(actorUserId: string, targetUserId: string): Promise<void> {
    const existing = await this.getById(targetUserId);

    if (existing.id === actorUserId) {
      throw ApiError.badRequest('You cannot archive your own account');
    }

    await prisma.$transaction(async (tx) => {
      await userRepository.archive(tx, existing.id);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'ARCHIVE',
        entityType: AuditEntityType.USER,
        entityId: existing.id,
        oldValue: { status: existing.status },
        newValue: { status: 'DEACTIVATED' },
      });
    });

    userLogger.info('User archived', { userId: existing.id, actorUserId });
  }

  /**
   * Restores a previously archived user.
   */
  async restoreUser(actorUserId: string, targetUserId: string): Promise<User> {
    const existing = await userRepository.findById(targetUserId, true);
    if (!existing) {
      throw ApiError.notFound('User not found');
    }

    const restored = await prisma.$transaction(async (tx) => {
      const result = await userRepository.restore(tx, existing.id);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'RESTORE',
        entityType: AuditEntityType.USER,
        entityId: existing.id,
        oldValue: { status: existing.status },
        newValue: { status: 'ACTIVE' },
      });

      return result;
    });

    userLogger.info('User restored', { userId: existing.id, actorUserId });

    return restored;
  }
}

export const userService = new UserService();
