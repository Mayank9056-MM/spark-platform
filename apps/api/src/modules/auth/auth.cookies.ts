import type { CookieOptions, Request, Response } from 'express';

import { env } from '../../config/env.js';

import type { AuthTokens } from './auth.types.js';

/**
 * The only place that knows how auth tokens travel between browser and API.
 * Security attributes are fixed here and deliberately not overridable by
 * callers. Both cookies are host-only (no Domain), HttpOnly and SameSite=Strict.
 */
const ACCESS_TOKEN_COOKIE = 'spark_access_token';
const REFRESH_TOKEN_COOKIE = 'spark_refresh_token';

const BASE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
} as const satisfies CookieOptions;

// Path is part of a cookie's identity: clearing must use exactly these values.
const ACCESS_OPTIONS = { ...BASE_OPTIONS, path: '/api/v1' } as const satisfies CookieOptions;
const REFRESH_OPTIONS = { ...BASE_OPTIONS, path: '/api/v1/auth' } as const satisfies CookieOptions;

/**
 * Sets both cookies together so they never get out of step.
 *
 * The access cookie deliberately outlives its 15-minute JWT and expires with
 * the refresh token. If the browser dropped it at JWT expiry, requireAuth
 * would see "no cookie" (UNAUTHENTICATED) instead of "expired token"
 * (TOKEN_EXPIRED), and the client, which refreshes only on TOKEN_EXPIRED,
 * would never recover. An expired JWT in the cookie fails verification, so it grants nothing.
 */
export function setAuthCookies(res: Response, tokens: AuthTokens): void {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...ACCESS_OPTIONS,
    expires: tokens.refreshTokenExpiresAt,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...REFRESH_OPTIONS,
    expires: tokens.refreshTokenExpiresAt,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, ACCESS_OPTIONS);
  res.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_OPTIONS);
}

function readCookie(req: Request, name: string): string | undefined {
  const value: unknown = req.cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function readAccessTokenCookie(req: Request): string | undefined {
  return readCookie(req, ACCESS_TOKEN_COOKIE);
}

export function readRefreshTokenCookie(req: Request): string | undefined {
  return readCookie(req, REFRESH_TOKEN_COOKIE);
}
