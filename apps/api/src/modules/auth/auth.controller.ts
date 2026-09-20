import type { Request, Response } from 'express';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { clearAuthCookies, readRefreshTokenCookie, setAuthCookies } from './auth.cookies.js';
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

function extractRequestMetadata(req: Request): RequestMetadata {
  const deviceNameHeader = req.headers['x-device-name'];
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    deviceName: typeof deviceNameHeader === 'string' ? deviceNameHeader : undefined,
  };
}

function requireRefreshTokenCookie(req: Request): string {
  const token = readRefreshTokenCookie(req);
  if (token === undefined) {
    throw ApiError.unauthorized('No refresh token provided', ErrorCode.TOKEN_INVALID);
  }
  return token;
}

/**
 * Authenticates a user using the single-college identity boundary.
 *
 * The client supplies only email/password. There is no organizationId,
 * collegeId, or tenant identifier in the request.
 */
export const login = async (req: Request, res: Response) => {
  const body = req.valid?.body as LoginBody;

  const result = await authService.login({
    email: body.email,
    password: body.password,
    requestMeta: extractRequestMetadata(req),
  });

  setAuthCookies(res, result.tokens);

  ApiResponse.ok(
    res,
    toLoginResponse(result.user, result.tokens.accessTokenExpiresAt),
    'Login successful',
  );
};

export const refresh = async (req: Request, res: Response) => {
  const rawRefreshToken = requireRefreshTokenCookie(req);
  const tokens = await authService.refreshTokens(rawRefreshToken, extractRequestMetadata(req));

  setAuthCookies(res, tokens);

  ApiResponse.ok(res, { accessTokenExpiresAt: tokens.accessTokenExpiresAt.toISOString() });
};

export const logout = async (req: Request, res: Response) => {
  // req.user is guaranteed by requireAuth on this route
  const { id: actorUserId, sessionId } = req.user!;
  await authService.logout(sessionId, actorUserId, extractRequestMetadata(req));

  clearAuthCookies(res);
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
    clearAuthCookies(res);
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

/**
 * Requests a password reset.
 *
 * No organization/college identifier is accepted from the client.
 *
 * The service must preserve anti-enumeration behavior by returning the
 * same externally visible result whether or not the email exists.
 */
export const requestPasswordReset = async (req: Request, res: Response) => {
  const body = req.valid?.body as RequestPasswordResetBody;
  await authService.requestPasswordReset(body.email);
  // Same response regardless of whether the account exists — anti-
  // enumeration, matching the service's own behavior.
  ApiResponse.ok(res, null, 'If that account exists, a reset link has been sent');
};

export const confirmPasswordReset = async (req: Request, res: Response) => {
  const body = req.valid?.body as ConfirmPasswordResetBody;
  await authService.confirmPasswordReset(body.token, body.password);
  ApiResponse.ok(res, null, 'Password reset successful — please log in again');
};
