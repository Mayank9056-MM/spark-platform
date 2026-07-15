import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

/**
 * Deliberately minimal payload — `sub` (userId) only for authorization
 * purposes. `sid` (sessionId) is included purely for log correlation, NOT
 * as a security mechanism — per the architecture decision, roles are never
 * embedded in the token and are always re-resolved fresh per request.
 */
export interface AccessTokenPayload {
  sub: string;
  sid: string;
}

export function signAccessToken(payload: AccessTokenPayload, ttlMs: number): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: Math.floor(ttlMs / 1000),
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}
