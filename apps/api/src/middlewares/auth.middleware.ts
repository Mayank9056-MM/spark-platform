import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { ApiError } from '../common/errors/ApiError.js';
import { ErrorCode } from '../common/errors/ErrorCodes.js';
import { type AccessTokenPayload, verifyAccessToken } from '../lib/jwt.js';
import { readAccessTokenCookie } from '../modules/auth/auth.cookies.js';
import { authRepository } from '../modules/auth/auth.repository.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = readAccessTokenCookie(req);

  if (token === undefined) {
    next(ApiError.unauthorized('Authentication required', ErrorCode.UNAUTHENTICATED));
    return;
  }

  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
    req.user = { id: payload.sub, sessionId: payload.sid };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(ApiError.unauthorized('Access token expired', ErrorCode.TOKEN_EXPIRED));
      return;
    }
    next(ApiError.unauthorized('Invalid access token', ErrorCode.TOKEN_INVALID));
    return;
  }

  // Allow logout route to proceed gracefully so client cookies are cleared
  const isLogoutRoute =
    req.path === '/logout' ||
    req.path === '/auth/logout' ||
    req.originalUrl?.endsWith('/auth/logout');

  try {
    const sessionWithUser = await authRepository.findActiveSessionWithUser(payload.sid);

    if (!sessionWithUser) {
      if (isLogoutRoute) {
        next();
        return;
      }
      next(ApiError.unauthorized('Session is no longer active', ErrorCode.TOKEN_INVALID));
      return;
    }

    const { user } = sessionWithUser;

    if (user.deletedAt !== null) {
      if (isLogoutRoute) {
        next();
        return;
      }
      next(ApiError.unauthorized('User no longer exists', ErrorCode.UNAUTHENTICATED));
      return;
    }

    if (user.status === 'SUSPENDED') {
      if (isLogoutRoute) {
        next();
        return;
      }
      next(
        ApiError.forbidden(
          'Your account has been suspended. Please contact an administrator.',
          ErrorCode.ACCOUNT_LOCKED,
        ),
      );
      return;
    }

    if (user.status === 'DEACTIVATED' || user.status === 'ARCHIVED') {
      if (isLogoutRoute) {
        next();
        return;
      }
      next(ApiError.unauthorized('Account is inactive', ErrorCode.UNAUTHENTICATED));
      return;
    }

    if (user.status === 'PENDING_ACTIVATION') {
      if (isLogoutRoute) {
        next();
        return;
      }
      next(
        ApiError.unauthorized(
          'Account is pending activation',
          ErrorCode.ACCOUNT_PENDING_ACTIVATION,
        ),
      );
      return;
    }

    if (user.status === 'LOCKED') {
      if (user.lockedUntil !== null && user.lockedUntil > new Date()) {
        if (isLogoutRoute) {
          next();
          return;
        }
        next(
          ApiError.forbidden(
            'Account is locked. Please contact an administrator.',
            ErrorCode.ACCOUNT_LOCKED,
          ),
        );
        return;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}
