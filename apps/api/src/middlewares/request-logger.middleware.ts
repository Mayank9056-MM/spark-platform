import { randomUUID } from 'node:crypto';

import { runWithContext } from '@spark/shared/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { httpLogger } from '@/lib/logger.js';

export interface RequestLoggerConfig {
  skipPaths?: string[];
  successLevel?: 'info' | 'debug';
  logIncoming?: boolean;
}

// Request IDs are a caller-supplied, log-injected value — bound it hard.
// A UUID is 36 chars; allow a little headroom for other reasonable ID
// schemes (ULIDs, etc.) without opening the door to multi-KB header abuse
// or control characters that could break structured log parsing.
const MAX_REQUEST_ID_LENGTH = 64;
const SAFE_REQUEST_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;

function isValidClientRequestId(value: string): boolean {
  return (
    value.length > 0 && value.length <= MAX_REQUEST_ID_LENGTH && SAFE_REQUEST_ID_PATTERN.test(value)
  );
}

/**
 * Resolves the request ID to use for this request: the client-supplied
 * X-Request-ID if it passes the safety check above, otherwise a freshly
 * generated UUID. Never trusts an unvalidated client value into logs,
 * audit records, or the response header (Phase 14).
 */
function resolveRequestId(req: Request): string {
  const header = req.headers['x-request-id'];
  const candidate = Array.isArray(header) ? header[0] : header;

  if (typeof candidate === 'string' && isValidClientRequestId(candidate)) {
    return candidate;
  }

  return randomUUID();
}

/**
 * req.ip is ONLY trustworthy once Express's `trust proxy` setting (app.ts,
 * driven by env.TRUST_PROXY) correctly matches the real deployment
 * topology. With trust proxy disabled (current default — no reverse proxy
 * configured yet), req.ip is the direct socket address, which is exactly
 * what we want: it cannot be spoofed by a client-supplied header. Do NOT
 * reintroduce manual X-Forwarded-For parsing here — that bypasses Express's
 * proxy-hop-count logic entirely and was the actual bug being fixed.
 */
function resolveIp(req: Request): string {
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

    const requestId = resolveRequestId(req);
    const startAt = process.hrtime.bigint();
    const ip = resolveIp(req);

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
