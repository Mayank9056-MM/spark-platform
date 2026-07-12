import { getContext, serializeError } from '@spark/shared/logger';
import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../common/errors/ApiError.js';
import { httpLogger } from '../lib/logger.js';

/**
 * Normalizes any thrown value into an ApiError shape before logging/responding.
 * Route handlers/services should throw ApiError directly where possible —
 * this is the safety net for anything that slips through unmapped
 * (a raw Error, a thrown string, a library error we haven't mapped yet).
 */
function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof Error) {
    return new ApiError(500, err.message, { expose: false });
  }

  return new ApiError(500, 'An unexpected error occurred', { expose: false });
}

export function errorLoggerMiddleware(
  err: unknown,
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const apiErr = toApiError(err);
  const ctx = getContext();

  const meta = {
    ...ctx,
    err: serializeError(err),
    method: req.method,
    path: req.path,
    statusCode: apiErr.statusCode,
    isOperational: apiErr.isOperational,
  };

  if (apiErr.statusCode < 500) {
    httpLogger.warn('Request error (operational)', meta);
  } else {
    httpLogger.error('Request error (unhandled)', meta);
  }

  next(err);
}

export function errorResponderMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const apiErr = toApiError(err);
  const ctx = getContext();

  const clientMessage = apiErr.expose ? apiErr.message : 'An unexpected error occurred';

  res.status(apiErr.statusCode).json({
    success: false,
    error: {
      message: clientMessage,
      code: apiErr.code,
      requestId: ctx.requestId,
    },
  });
}
