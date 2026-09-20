import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../common/errors/ApiError.js';
import { env } from '../config/env.js';
import { httpLogger } from '../lib/logger.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Normalised once at boot: an Origin header never has a path or trailing slash,
// but CORS_ORIGIN could. An invalid CORS_ORIGIN fails startup here.
const ALLOWED_ORIGIN = new URL(env.CORS_ORIGIN).origin;

/**
 * CSRF defence for cookie authentication (together with SameSite=Strict).
 * Browsers always attach `Origin` to unsafe-method requests, so a request that
 * carries one must come from the configured frontend. A missing Origin means
 * a non-browser client (Postman, curl, server-side fetch), which is not a CSRF
 * vector because CSRF needs a victim's browser. `Origin: null` is rejected.
 * No routes are exempt: login and password reset are protected too.
 */
export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  if (SAFE_METHODS.has(req.method) || origin === undefined || origin === ALLOWED_ORIGIN) {
    next();
    return;
  }

  httpLogger.warn('Blocked request from untrusted origin', {
    origin,
    method: req.method,
    path: req.path,
  });
  next(ApiError.forbidden('Cross-origin request blocked'));
}
