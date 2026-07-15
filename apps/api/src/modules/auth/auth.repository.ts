import type {
  RefreshToken,
  Session,
  User,
  VerificationPurpose,
  VerificationToken,
} from '@spark/database';
import { Prisma } from '@spark/database';

import { prisma } from '../../lib/prisma.js';

interface CreateSessionInput {
  userId: string;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
  deviceName?: string | undefined;
  expiresAt: Date;
}

interface CreateRefreshTokenInput {
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
}

interface CreateVerificationTokenInput {
  userId: string;
  purpose: VerificationPurpose;
  tokenHash: string;
  expiresAt: Date;
  metadata?: Prisma.InputJsonValue;
}

/**
 * The ONLY file in this module allowed to call `prisma.*` directly.
 * auth.service.ts orchestrates business logic and calls these methods;
 * it never touches Prisma itself. This is what lets soft-delete filtering,
 * tenant scoping, and query shape stay correct in exactly one place as the
 * app grows, instead of drifting across every service that happens to
 * need a user lookup.
 */
export class AuthRepository {
  // Users

  /**
   * The login-path lookup. Deliberately does NOT filter by `status` here
   * the service layer decides what to do with a SUSPENDED/LOCKED/ARCHIVED
   * user (different error messages, different logging), which means this
   * repository method's job is only "does this identity exist," not
   * "is this identity allowed to log in right now."
   */
  async findUserByOrgAndEmail(organizationId: string, email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        organizationId,
        email: email.toLowerCase(),
        deletedAt: null,
      },
    });
  }

  async findUserById(userId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
  }

  async incrementFailedLoginAttempts(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  async resetFailedLoginAttempts(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async lockUser(userId: string, lockedUntil: Date): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { status: 'LOCKED', lockedUntil },
    });
  }

  async recordSuccessfulLogin(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        status: 'ACTIVE',
        lastPasswordChangeAt: new Date(),
      },
    });
  }

  // Sessions

  async createSession(input: CreateSessionInput): Promise<Session> {
    return prisma.session.create({
      data: {
        userId: input.userId,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
        deviceName: input.deviceName ?? null,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findActiveSessionById(sessionId: string): Promise<Session | null> {
    return prisma.session.findFirst({
      where: { id: sessionId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async listActiveSessionsForUser(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  /**
   * Throttled at the service layer, not here — this method just performs
   * the write. Calling it on every single authenticated request would
   * write-amplify this table badly at scale; the service decides when
   * enough time has passed since the last update to bother calling this.
   */
  async touchSessionActivity(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Powers "log out everywhere" and the password-reset-revokes-all-sessions
   * rule. `exceptSessionId` is optional so the same method serves both
   * "revoke everything" and "revoke everything but where I am right now."
   */
  async revokeAllSessionsForUser(userId: string, exceptSessionId?: string): Promise<number> {
    const result = await prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  // Refresh Tokens

  async createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data: {
        sessionId: input.sessionId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
  }

  // Verification Tokens

  async createVerificationToken(input: CreateVerificationTokenInput): Promise<VerificationToken> {
    return prisma.verificationToken.create({
      data: {
        userId: input.userId,
        purpose: input.purpose,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  }

  /**
   * Only returns a token if it is unused AND unexpired. The service layer
   * never has to remember to check both conditions separately — a single
   * call here either yields a genuinely consumable token or null, with no
   * ambiguity about which failure mode occurred (the service returns the
   * same generic error either way, per the timing/enumeration discipline
   * established earlier).
   */
  async findValidVerificationToken(
    tokenHash: string,
    purpose: VerificationPurpose,
  ): Promise<VerificationToken | null> {
    return prisma.verificationToken.findFirst({
      where: {
        tokenHash,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async markVerificationTokenUsed(tokenId: string): Promise<void> {
    await prisma.verificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async unlockUser(userId: string): Promise<User> {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status: 'ACTIVE',
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * Unfiltered lookup — unlike findActiveSessionById, this returns a session
   * even if already revoked/expired. Used specifically for audit-trail
   * enrichment, where we need to know WHO a session belonged to even after
   * it's no longer usable.
   */
  async findSessionById(sessionId: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { id: sessionId } });
  }
}

export const authRepository = new AuthRepository();
