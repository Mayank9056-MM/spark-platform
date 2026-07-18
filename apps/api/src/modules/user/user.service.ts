import type { User } from '@spark/database';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { userLogger } from '../../lib/logger.js';
import { recordAudit } from '../audit/audit.service.js';
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
   * off to Auth for activation-token issuance in the same operation, but
   * never touches a password or generates a token itself — that stays
   * entirely inside auth.service.ts.
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

    const user = await userRepository.create({ ...input, organizationId });
    const activationToken = await authService.issueActivationToken(user.id);

    await recordAudit({
      organizationId,
      actorUserId,
      action: 'CREATE',
      entityType: AuditEntityType.USER,
      entityId: user.id,
      newValue: { email: user.email, status: user.status },
    });

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
    const updated = await userRepository.update(existing.id, input);

    await recordAudit({
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

    await userRepository.archive(existing.id);

    await recordAudit({
      organizationId,
      actorUserId,
      action: 'DELETE',
      entityType: AuditEntityType.USER,
      entityId: existing.id,
      oldValue: { status: existing.status },
      newValue: { status: 'DEACTIVATED' },
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

    const restored = await userRepository.restore(existing.id);

    await recordAudit({
      organizationId,
      actorUserId,
      action: 'UPDATE',
      entityType: AuditEntityType.USER,
      entityId: existing.id,
      oldValue: { status: existing.status },
      newValue: { status: 'ACTIVE' },
    });

    userLogger.info('User restored', { userId: existing.id, actorUserId });

    return restored;
  }
}

export const userService = new UserService();
