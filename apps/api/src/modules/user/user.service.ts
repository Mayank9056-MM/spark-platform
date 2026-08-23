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
    organizationId: string,
    input: Omit<CreateUserInput, 'organizationId'>,
  ): Promise<{ user: User; activationToken: string }> {
    const emailTaken = await userRepository.existsByEmail(organizationId, input.email);
    if (emailTaken) {
      throw ApiError.conflict('A user with this email already exists', ErrorCode.DUPLICATE_ENTRY);
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await userRepository.create(tx, { ...input, organizationId });

      await recordAuditTx(tx, {
        organizationId,
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.USER,
        entityId: created.id,
        newValue: { email: created.email, status: created.status },
      });

      return created;
    });
    // NOTE: existsByEmail-then-create is check-then-act, not atomic — a
    // genuine race (two concurrent creates for the same email) is still
    // possible and would surface as a Prisma P2002 on the unique
    // (organizationId, email) constraint, mapped by mapPrismaError to a
    // clean 409. The DB constraint is the actual backstop here; the
    // existsByEmail check above is a fast-path UX improvement, not the
    // source of truth.

    const activationToken = await authService.issueActivationToken(user.id);

    userLogger.info('User created', { userId: user.id, actorUserId });

    return { user, activationToken };
  }

  async getById(organizationId: string, id: string): Promise<User> {
    const user = await userRepository.findById(organizationId, id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  async listUsers(filters: ListUsersFilters, options: ListUsersOptions): Promise<ListUsersResult> {
    return userRepository.findMany(filters, options);
  }

  async updateUser(
    actorUserId: string,
    organizationId: string,
    targetUserId: string,
    input: UpdateUserInput,
  ): Promise<User> {
    const existing = await this.getById(organizationId, targetUserId);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await userRepository.update(tx, organizationId, existing.id, input);

      await recordAuditTx(tx, {
        organizationId,
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

  async archiveUser(
    actorUserId: string,
    organizationId: string,
    targetUserId: string,
  ): Promise<void> {
    const existing = await this.getById(organizationId, targetUserId);

    if (existing.id === actorUserId) {
      throw ApiError.badRequest('You cannot archive your own account');
    }

    await prisma.$transaction(async (tx) => {
      await userRepository.archive(tx, organizationId, existing.id);

      // action: ARCHIVE, not DELETE — this is a reversible deactivation
      // (see user.repository.ts's archive() doc comment on the
      // DEACTIVATED-vs-ARCHIVED-status distinction). Recording it as
      // AuditAction.DELETE was misleading to anyone reading the audit log
      // later: nothing was deleted, and restoreUser() below proves it.
      await recordAuditTx(tx, {
        organizationId,
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

  async restoreUser(
    actorUserId: string,
    organizationId: string,
    targetUserId: string,
  ): Promise<User> {
    const existing = await userRepository.findById(organizationId, targetUserId, true);
    if (!existing) {
      throw ApiError.notFound('User not found');
    }

    const restored = await prisma.$transaction(async (tx) => {
      const result = await userRepository.restore(tx, organizationId, existing.id);

      await recordAuditTx(tx, {
        organizationId,
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
