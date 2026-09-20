import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { ApiError } from '../common/errors/ApiError.js';
import { ErrorCode } from '../common/errors/ErrorCodes.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { readAccessTokenCookie } from '../modules/auth/auth.cookies.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readAccessTokenCookie(req);

  if (token === undefined) {
    next(ApiError.unauthorized('Authentication required', ErrorCode.UNAUTHENTICATED));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, sessionId: payload.sid };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(ApiError.unauthorized('Access token expired', ErrorCode.TOKEN_EXPIRED));
      return;
    }
    next(ApiError.unauthorized('Invalid access token', ErrorCode.TOKEN_INVALID));
  }
}
