import type { Session, User } from '@spark/database';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { signAccessToken } from '../../lib/jwt.js';
import { authLogger } from '../../lib/logger.js';
import { hashPassword, verifyDummyPassword, verifyPassword } from '../../lib/password.js';
import { generateOpaqueToken, hashToken } from '../../lib/tokens.js';
import { recordAudit } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';

import { AUTH_CONSTANTS } from './auth.constants.js';
import { authRepository } from './auth.repository.js';
import type { AuthTokens, LoginParams, LoginResult, RequestMetadata } from './auth.types.js';

export class AuthService {
  // Login

  async login(params: LoginParams): Promise<LoginResult> {
    const { organizationId, email, password, requestMeta } = params;
    const user = await authRepository.findUserByOrgAndEmail(organizationId, email);

    if (!user) {
      await verifyDummyPassword(password);
      authLogger.warn('Login attempt for non-existent user', { organizationId, email });
      throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    }

    const allowedUser = await this.assertLoginAllowed(user);

    if (!allowedUser.passwordHash) {
      authLogger.error('Active user has no passwordHash — data integrity issue', {
        userId: allowedUser.id,
      });
      throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    }

    const passwordValid = await verifyPassword(allowedUser.passwordHash, password);
    if (!passwordValid) {
      await this.handleFailedLogin(allowedUser);
      throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    }

    const updatedUser = await authRepository.recordSuccessfulLogin(allowedUser.id);

    const session = await authRepository.createSession({
      userId: updatedUser.id,
      userAgent: requestMeta.userAgent,
      ipAddress: requestMeta.ipAddress,
      deviceName: requestMeta.deviceName,
      expiresAt: new Date(Date.now() + AUTH_CONSTANTS.SESSION_TTL_MS),
    });

    const tokens = await this.issueTokenPair(updatedUser.id, session.id);

    await recordAudit({
      organizationId: updatedUser.organizationId,
      actorUserId: updatedUser.id,
      action: 'LOGIN',
      entityType: AuditEntityType.USER,
      entityId: updatedUser.id,
      ipAddress: requestMeta.ipAddress ?? null,
      userAgent: requestMeta.userAgent ?? null,
    });

    authLogger.info('User logged in', { userId: updatedUser.id, sessionId: session.id });

    return { user: updatedUser, sessionId: session.id, tokens };
  }

  /**
   * Validates login is permitted for this user's current status, and
   * performs auto-recovery from LOCKED when the cooldown has passed.
   * Returns the (possibly updated) user so callers always work with
   * current state rather than a stale snapshot.
   */
  private async assertLoginAllowed(user: User): Promise<User> {
    if (user.status === 'PENDING_ACTIVATION') {
      throw ApiError.unauthorized(
        'Please activate your account before logging in.',
        ErrorCode.ACCOUNT_PENDING_ACTIVATION,
      );
    }

    if (user.status === 'LOCKED') {
      const cooldownExpired = user.lockedUntil !== null && user.lockedUntil <= new Date();
      if (cooldownExpired) {
        const unlocked = await authRepository.unlockUser(user.id);
        authLogger.info('Account auto-unlocked after cooldown', { userId: user.id });
        return unlocked;
      }

      // Deliberate tradeoff: telling a locked-out user their account is
      // locked reveals the account exists (unlike the generic message
      // used elsewhere). Accepted because the endpoint is already rate-
      // limited and a legitimate locked-out user needs actionable
      // feedback rather than an indistinguishable "wrong password."
      const message = user.lockedUntil
        ? `Account locked. Try again after ${user.lockedUntil.toISOString()}.`
        : 'Account locked. Contact an administrator to unlock it.';
      throw ApiError.forbidden(message, ErrorCode.ACCOUNT_LOCKED);
    }

    if (
      user.status === 'SUSPENDED' ||
      user.status === 'DEACTIVATED' ||
      user.status === 'ARCHIVED'
    ) {
      // Deliberately generic here, unlike LOCKED/PENDING_ACTIVATION above —
      // do not confirm a disciplinary/terminal account state exists.
      throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    }

    return user;
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const updated = await authRepository.incrementFailedLoginAttempts(user.id);

    if (updated.failedLoginAttempts >= AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + AUTH_CONSTANTS.LOCKOUT_DURATION_MS);
      await authRepository.lockUser(user.id, lockedUntil);
      authLogger.warn('Account locked after repeated failed logins', {
        userId: user.id,
        attempts: updated.failedLoginAttempts,
      });
    } else {
      authLogger.warn('Failed login attempt', {
        userId: user.id,
        attempts: updated.failedLoginAttempts,
      });
    }
  }

  private async issueTokenPair(userId: string, sessionId: string): Promise<AuthTokens> {
    const accessTokenExpiresAt = new Date(Date.now() + AUTH_CONSTANTS.ACCESS_TOKEN_TTL_MS);
    const accessToken = signAccessToken(
      { sub: userId, sid: sessionId },
      AUTH_CONSTANTS.ACCESS_TOKEN_TTL_MS,
    );

    const rawRefreshToken = generateOpaqueToken();
    const refreshTokenExpiresAt = new Date(Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_TTL_MS);
    await authRepository.createRefreshToken({
      sessionId,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: refreshTokenExpiresAt,
    });

    return {
      accessToken,
      accessTokenExpiresAt,
      refreshToken: rawRefreshToken,
      refreshTokenExpiresAt,
    };
  }

  // Refresh (rotation + reuse detection)

  async refreshTokens(rawRefreshToken: string, requestMeta: RequestMetadata): Promise<AuthTokens> {
    const tokenHash = hashToken(rawRefreshToken);
    const existingToken = await authRepository.findRefreshTokenByHash(tokenHash);

    if (!existingToken) {
      authLogger.warn('Refresh attempted with unknown token');
      throw ApiError.unauthorized('Invalid refresh token', ErrorCode.TOKEN_INVALID);
    }

    if (existingToken.revokedAt !== null) {
      // REUSE DETECTED: this exact token was already rotated once. Someone
      // (possibly holding a stolen earlier token) is presenting a token
      // that should no longer exist in usable form — revoke the whole
      // session, not just this token.
      await authRepository.revokeSession(existingToken.sessionId);
      authLogger.error('Refresh token reuse detected — session revoked', {
        sessionId: existingToken.sessionId,
      });
      await recordAudit({
        organizationId: null,
        actorUserId: null,
        action: 'OTHER',
        entityType: AuditEntityType.SESSION,
        entityId: existingToken.sessionId,
        newValue: { reason: 'refresh_token_reuse_detected' },
        ipAddress: requestMeta.ipAddress ?? null,
        userAgent: requestMeta.userAgent ?? null,
      });
      throw ApiError.unauthorized(
        'Session invalidated — please log in again',
        ErrorCode.TOKEN_INVALID,
      );
    }

    if (existingToken.expiresAt <= new Date()) {
      throw ApiError.unauthorized('Refresh token expired', ErrorCode.TOKEN_EXPIRED);
    }

    const session = await authRepository.findActiveSessionById(existingToken.sessionId);
    if (!session) {
      throw ApiError.unauthorized('Session no longer active', ErrorCode.TOKEN_INVALID);
    }

    await authRepository.revokeRefreshToken(existingToken.id);
    const tokens = await this.issueTokenPair(session.userId, session.id);
    await this.maybeTouchSessionActivity(session);

    return tokens;
  }

  private async maybeTouchSessionActivity(session: Session): Promise<void> {
    const elapsed = Date.now() - session.lastActivityAt.getTime();
    if (elapsed > AUTH_CONSTANTS.SESSION_ACTIVITY_THROTTLE_MS) {
      await authRepository.touchSessionActivity(session.id);
    }
  }

  // Logout / Session management

  async logout(
    sessionId: string,
    actorUserId: string,
    requestMeta: RequestMetadata,
  ): Promise<void> {
    await authRepository.revokeSession(sessionId);
    await recordAudit({
      organizationId: null,
      actorUserId,
      action: 'LOGOUT',
      entityType: AuditEntityType.SESSION,
      entityId: sessionId,
      ipAddress: requestMeta.ipAddress ?? null,
      userAgent: requestMeta.userAgent ?? null,
    });
    authLogger.info('User logged out', { sessionId, actorUserId });
  }

  async logoutAllDevices(userId: string, exceptSessionId?: string): Promise<number> {
    const count = await authRepository.revokeAllSessionsForUser(userId, exceptSessionId);
    authLogger.info('All sessions revoked for user', { userId, count, exceptSessionId });
    return count;
  }

  async listSessions(userId: string): Promise<Session[]> {
    return authRepository.listActiveSessionsForUser(userId);
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await authRepository.findActiveSessionById(sessionId);
    // Same generic error whether the session doesn't exist or belongs to
    // someone else — don't reveal which, to avoid leaking session-ID
    // guessing feedback to a caller probing IDs that aren't theirs.
    if (session?.userId !== userId) {
      throw ApiError.notFound('Session not found');
    }
    await authRepository.revokeSession(sessionId);
    authLogger.info('Session revoked by user', { userId, sessionId });
  }

  // Account activation

  async issueActivationToken(userId: string): Promise<string> {
    const rawToken = generateOpaqueToken();
    await authRepository.createVerificationToken({
      userId,
      purpose: 'ACCOUNT_ACTIVATION',
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + AUTH_CONSTANTS.ACTIVATION_TOKEN_TTL_MS),
    });
    authLogger.info('Activation token issued', { userId });

    return rawToken;
  }

  async activateAccount(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const verificationToken =
      (await authRepository.findValidVerificationToken(tokenHash, 'ACCOUNT_ACTIVATION')) ??
      (await authRepository.findValidVerificationToken(tokenHash, 'INVITE_USER'));

    if (!verificationToken) {
      throw ApiError.badRequest(
        'This activation link is invalid or has expired.',
        ErrorCode.TOKEN_INVALID,
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const user = await authRepository.setPasswordHash(verificationToken.userId, passwordHash);
    await authRepository.markVerificationTokenUsed(verificationToken.id);

    await recordAudit({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'UPDATE',
      entityType: AuditEntityType.USER,
      entityId: user.id,
      newValue: { status: user.status },
    });

    authLogger.info('Account activated', { userId: user.id });
  }

  // Password reset

  async requestPasswordReset(organizationId: string, email: string): Promise<void> {
    const user = await authRepository.findUserByOrgAndEmail(organizationId, email);

    if (user && user.status !== 'ARCHIVED') {
      const rawToken = generateOpaqueToken();
      await authRepository.createVerificationToken({
        userId: user.id,
        purpose: 'PASSWORD_RESET',
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_TTL_MS),
      });

      // TODO(notification module): enqueue a BullMQ job to email rawToken
      // to user.email. Deliberately not implemented here — delivery is a
      // notification-module concern, not an auth-module one.
      authLogger.info('Password reset token issued', { userId: user.id });
    } else {
      authLogger.info('Password reset requested for unknown/archived account', {
        organizationId,
        email,
      });
    }
  }

  async confirmPasswordReset(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const verificationToken = await authRepository.findValidVerificationToken(
      tokenHash,
      'PASSWORD_RESET',
    );

    if (!verificationToken) {
      throw ApiError.badRequest(
        'This reset link is invalid or has expired.',
        ErrorCode.TOKEN_INVALID,
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const user = await authRepository.setPasswordHash(verificationToken.userId, passwordHash);
    await authRepository.markVerificationTokenUsed(verificationToken.id);

    // A password reset revokes every existing session — if the reset was
    // triggered by a compromise concern, leaving old sessions valid would
    // defeat the entire point.
    await authRepository.revokeAllSessionsForUser(user.id);

    await recordAudit({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'UPDATE',
      entityType: AuditEntityType.USER,
      entityId: user.id,
      newValue: { passwordChanged: true },
    });

    authLogger.info('Password reset completed, all sessions revoked', { userId: user.id });
  }
}

export const authService = new AuthService();
