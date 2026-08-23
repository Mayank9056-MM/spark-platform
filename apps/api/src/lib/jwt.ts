import jwt from 'jsonwebtoken';
import { z } from 'zod';

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

/**
 * Runtime shape validation for the decoded JWT payload. `jwt.verify`
 * guarantees the token was signed with our secret and hasn't expired — it
 * does NOT guarantee the payload has the shape we expect. A `jwt.verify(...)
 * as AccessTokenPayload` cast (the previous implementation) would silently
 * accept a validly-signed token whose payload was malformed or empty, and
 * only fail later, confusingly, wherever `sub`/`sid` first got used as a
 * string. Validating here means a malformed payload fails at the one place
 * responsible for token verification, with a clear error.
 */
const accessTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  sid: z.string().min(1),
});

export function signAccessToken(payload: AccessTokenPayload, ttlMs: number): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: Math.floor(ttlMs / 1000),
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    // Explicit algorithm allowlist (Phase 4) — without this, jsonwebtoken
    // will accept ANY algorithm the token header claims, including 'none'
    // in some configurations/older versions. This is what actually closes
    // algorithm-confusion attacks; the shared secret alone does not.
    algorithms: ['HS256'],
  });

  const result = accessTokenPayloadSchema.safeParse(decoded);
  if (!result.success) {
    // Deliberately a plain Error, not ApiError — this module has no
    // knowledge of HTTP status codes; requireAuth (the sole caller) already
    // catches jwt.* errors and maps them to ApiError. A malformed-but-
    // validly-signed payload should be treated identically to "invalid
    // token" by that catch block, which it will be since this isn't a
    // jwt.TokenExpiredError.
    throw new Error('Access token payload failed validation');
  }

  return result.data;
}
