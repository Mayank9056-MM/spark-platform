import type { Session, User } from '@spark/database';

import type { LoginResponseDTO, SessionSummaryDTO, UserPublicDTO } from './auth.types.js';

/**
 * Strips every internal/security-sensitive field off a User row before it
 * can reach an API response. This must be the ONLY place in the codebase
 * that shapes a User for output — if a controller ever hand-picks fields
 * itself instead of calling this, the next field added to the User model
 * (or a copy-paste mistake) can leak passwordHash silently. Route every
 * User-returning endpoint through this function, no exceptions.
 */
export function toPublicUser(user: User): UserPublicDTO {
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    status: user.status,
    avatarUrl: user.avatarUrl,
    lockedUntil: user.lockedUntil ? user.lockedUntil.toISOString() : null,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toLoginResponse(
  user: User,
  accessToken: string,
  accessTokenExpiresAt: Date,
): LoginResponseDTO {
  return {
    user: toPublicUser(user),
    accessToken,
    accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
  };
}

/**
 * Maps a Session row for the "manage my devices" screen. `currentSessionId`
 * is passed in by the caller rather than resolved here — the mapper stays a
 * pure function of its inputs with no knowledge of the current request,
 * which is what makes it trivial to unit-test without mocking Express at all.
 */
export function toSessionSummary(session: Session, currentSessionId: string): SessionSummaryDTO {
  return {
    id: session.id,
    deviceName: session.deviceName,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    location: session.location,
    lastActivityAt: session.lastActivityAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    isCurrent: session.id === currentSessionId,
  };
}

export function toSessionSummaryList(
  sessions: Session[],
  currentSessionId: string,
): SessionSummaryDTO[] {
  return sessions.map((session) => toSessionSummary(session, currentSessionId));
}
