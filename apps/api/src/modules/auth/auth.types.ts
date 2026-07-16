import type { User, UserStatus } from '@spark/database';

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string; // raw value — only ever returned once, never persisted as-is
  refreshTokenExpiresAt: Date;
}

export interface LoginResult {
  user: User;
  sessionId: string;
  tokens: AuthTokens;
}

// The ONLY shape a User is allowed to take once it leaves this module.
export interface UserPublicDTO {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  status: UserStatus;
  avatarUrl: string | null;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SessionSummaryDTO {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  location: string | null;
  lastActivityAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface LoginResponseDTO {
  user: UserPublicDTO;
  accessToken: string;
  accessTokenExpiresAt: string;
}

export interface RequestMetadata {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  deviceName?: string | undefined;
}

export interface LoginParams {
  organizationId: string;
  email: string;
  password: string;
  requestMeta: RequestMetadata;
}
