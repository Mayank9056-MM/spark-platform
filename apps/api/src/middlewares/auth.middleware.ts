import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { ApiError } from '@/common/errors/ApiError.js';
import { ErrorCode } from '@/common/errors/ErrorCodes.js';
import { verifyAccessToken } from '@/lib/jwt.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Authentication required', ErrorCode.UNAUTHENTICATED));
    return;
  }

  const token = header.slice('Bearer '.length);

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
