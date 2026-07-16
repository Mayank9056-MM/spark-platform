import type { Request, Response } from 'express';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { ApiResponse } from '../../common/responses/ApiResponse.js';
import { env } from '../../config/env.js';

import { toLoginResponse, toSessionSummaryList } from './auth.mapper.js';
import { authService } from './auth.service.js';
import type { RequestMetadata } from './auth.types.js';
import type {
  ActivateAccountBody,
  ConfirmPasswordResetBody,
  LoginBody,
  LogoutAllDevicesBody,
  RequestPasswordResetBody,
  RevokeSessionParams,
} from './auth.validation.js';

const REFRESH_TOKEN_COOKIE = 'spark_refresh_token';
const AUTH_COOKIE_PATH = '/api/v1/auth';

function extractRequestMetadata(req: Request): RequestMetadata {
  const deviceNameHeader = req.headers['x-device-name'];
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    deviceName: typeof deviceNameHeader === 'string' ? deviceNameHeader : undefined,
  };
}

function setRefreshTokenCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: AUTH_COOKIE_PATH,
    expires: expiresAt,
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: AUTH_COOKIE_PATH });
}

function requireRefreshTokenCookie(req: Request): string {
  const token: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];
  if (typeof token !== 'string' || token.length === 0) {
    throw ApiError.unauthorized('No refresh token provided', ErrorCode.TOKEN_INVALID);
  }
  return token;
}

export const login = async (req: Request, res: Response) => {
  const body = req.valid?.body as LoginBody;

  const result = await authService.login({
    organizationId: body.organizationId,
    email: body.email,
    password: body.password,
    requestMeta: extractRequestMetadata(req),
  });

  setRefreshTokenCookie(res, result.tokens.refreshToken, result.tokens.refreshTokenExpiresAt);

  ApiResponse.ok(
    res,
    toLoginResponse(result.user, result.tokens.accessToken, result.tokens.accessTokenExpiresAt),
    'Login successful',
  );
};

export const refresh = async (req: Request, res: Response) => {
  const rawRefreshToken = requireRefreshTokenCookie(req);
  const tokens = await authService.refreshTokens(rawRefreshToken, extractRequestMetadata(req));

  setRefreshTokenCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);

  ApiResponse.ok(res, {
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt.toISOString(),
  });
};

export const logout = async (req: Request, res: Response) => {
  // req.user is guaranteed by requireAuth on this route
  const { id: actorUserId, sessionId } = req.user!;
  await authService.logout(sessionId, actorUserId, extractRequestMetadata(req));

  clearRefreshTokenCookie(res);
  ApiResponse.ok(res, null, 'Logged out');
};

export const logoutAllDevices = async (req: Request, res: Response) => {
  const { id: userId, sessionId } = req.user!;
  const body = req.valid?.body as LogoutAllDevicesBody;

  const count = await authService.logoutAllDevices(
    userId,
    body.keepCurrentSession ? sessionId : undefined,
  );

  if (!body.keepCurrentSession) {
    clearRefreshTokenCookie(res);
  }

  ApiResponse.ok(res, { revokedCount: count }, 'Signed out of all devices');
};

export const listSessions = async (req: Request, res: Response) => {
  const { id: userId, sessionId: currentSessionId } = req.user!;
  const sessions = await authService.listSessions(userId);
  ApiResponse.ok(res, toSessionSummaryList(sessions, currentSessionId));
};

export const revokeSession = async (req: Request, res: Response) => {
  const { id: userId } = req.user!;
  const params = req.valid?.params as RevokeSessionParams;

  await authService.revokeSession(userId, params.sessionId);
  ApiResponse.ok(res, null, 'Session revoked');
};

export const activateAccount = async (req: Request, res: Response) => {
  const body = req.valid?.body as ActivateAccountBody;
  await authService.activateAccount(body.token, body.password);
  ApiResponse.ok(res, null, 'Account activated — you may now log in');
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const body = req.valid?.body as RequestPasswordResetBody;
  await authService.requestPasswordReset(body.organizationId, body.email);
  // Same response regardless of whether the account exists — anti-
  // enumeration, matching the service's own behavior.
  ApiResponse.ok(res, null, 'If that account exists, a reset link has been sent');
};

export const confirmPasswordReset = async (req: Request, res: Response) => {
  const body = req.valid?.body as ConfirmPasswordResetBody;
  await authService.confirmPasswordReset(body.token, body.password);
  ApiResponse.ok(res, null, 'Password reset successful — please log in again');
};
