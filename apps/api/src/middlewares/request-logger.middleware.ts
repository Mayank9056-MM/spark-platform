import { randomUUID } from 'node:crypto';

import { runWithContext } from '@spark/shared/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { httpLogger } from '@/lib/logger.js';

export interface RequestLoggerConfig {
  skipPaths?: string[];
  successLevel?: 'info' | 'debug';
  logIncoming?: boolean;
}

function extractIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export function createRequestLogger(cfg: RequestLoggerConfig = {}): RequestHandler {
  const {
    skipPaths = ['/health', '/healthz', '/metrics', '/favicon.ico'],
    successLevel = 'info',
    logIncoming = false,
  } = cfg;

  return function requestLogger(req: Request, res: Response, next: NextFunction): void {
    if (skipPaths.some((p) => req.path.startsWith(p))) {
      return next();
    }

    const requestId = (req.headers['x-request-id'] as string) ?? randomUUID();
    const startAt = process.hrtime.bigint();
    const ip = extractIp(req);

    res.setHeader('X-Request-ID', requestId);

    runWithContext({ requestId, ip }, () => {
      if (logIncoming) {
        httpLogger.debug('Incoming request', {
          requestId,
          method: req.method,
          path: req.path,
          ip,
          userAgent: req.headers['user-agent'],
        });
      }

      res.on('finish', () => {
        const durationNs = process.hrtime.bigint() - startAt;
        const durationMs = Number(durationNs / 1_000_000n);
        const { statusCode } = res;
        const contentLength = res.getHeader('content-length');

        const meta = {
          requestId,
          method: req.method,
          path: req.path,
          statusCode,
          durationMs,
          ip,
          userAgent: req.headers['user-agent'],
          contentLength: contentLength ? Number(contentLength) : undefined,
        };

        if (statusCode >= 500) {
          httpLogger.error('Request failed', meta);
        } else if (statusCode >= 400) {
          httpLogger.warn('Request client error', meta);
        } else {
          httpLogger[successLevel]('Request completed', meta);
        }
      });

      next();
    });
  };
}

export const requestLoggerMiddleware = createRequestLogger();
