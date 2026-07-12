import { getContext, serializeError } from '@spark/shared/logger';
import type { NextFunction, Request, Response } from 'express';

import { httpLogger } from '@/lib/logger.js';

export interface HttpError extends Error {
  statusCode?: number;
  status?: number;
  expose?: boolean;
  code?: string;
  isOperational?: boolean;
}

export function errorLoggerMiddleware(
  err: HttpError,
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const statusCode = err.statusCode ?? err.status ?? 500;
  const ctx = getContext();

  const meta = {
    ...ctx,
    err: serializeError(err),
    method: req?.method,
    path: req?.path,
    statusCode,
    isOperational: err.isOperational ?? statusCode < 500,
  };

  if (statusCode < 500) {
    httpLogger.warn('Request error (operational)', meta);
  } else {
    httpLogger.error('Request error (unhandled)', meta);
  }

  next(err);
}

export function errorResponderMiddleware(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? err.status ?? 500;
  const ctx = getContext();

  const clientMessage =
    err.expose === true
      ? err.message
      : statusCode < 500
        ? err.message
        : 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    error: {
      message: clientMessage,
      code: err.code,
      requestId: ctx.requestId,
    },
  });
}
