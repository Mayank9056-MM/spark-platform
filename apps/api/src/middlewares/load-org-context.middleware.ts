import { runWithContext } from '@spark/shared/logger';
import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../common/errors/ApiError.js';
import { ErrorCode } from '../common/errors/ErrorCodes.js';
import { prisma } from '../lib/prisma.js';

/**
 * Resolves req.user.organizationId AND re-validates the account is still
 * usable, in the same query. Previously this only checked existence — a
 * user who was deactivated/archived/soft-deleted AFTER their access token
 * was issued would sail straight through to every User-module route until
 * the token naturally expired (Phase 5/6: JWT validity, session validity,
 * and USER ACCOUNT STATUS are three different checks, and this closes the
 * "account validity" gap). This is the same query that already ran before —
 * the extra WHERE clauses cost nothing extra.
 *
 * Per the documented security model: this is the per-request account-status
 * check. It does NOT achieve instant revocation of an access token itself —
 * that remains bounded by ACCESS_TOKEN_TTL_MS (requireAuth only verifies
 * the JWT signature/expiry, it never re-hits the DB). What this DOES
 * guarantee is that once a user is deactivated/archived, they lose access to
 * every route behind loadOrganizationContext (all of /api/v1/users/*)
 * within one request — they don't get a full TTL of continued access to
 * those routes specifically. See docs/architecture/session-lifecycle.md.
 */
export async function loadOrganizationContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    next(ApiError.unauthorized('Authentication required', ErrorCode.UNAUTHENTICATED));
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: req.user.id,
      deletedAt: null,
      status: 'ACTIVE',
    },
    select: { organizationId: true },
  });

  if (!user) {
    // Deliberately the same generic message/code as "doesn't exist" —
    // distinguishing "deactivated" from "never existed" to the caller here
    // would leak account-status information to whoever holds the (possibly
    // stolen) access token, which is a worse outcome than a slightly less
    // specific error.
    next(ApiError.unauthorized('User not found', ErrorCode.UNAUTHENTICATED));
    return;
  }

  req.user.organizationId = user.organizationId;

  // Merge organizationId into the log/audit context for the rest of this
  // request (Phase 23) — requestId/ip were already set by
  // requestLoggerMiddleware; runWithContext accumulates rather than
  // replaces, so those survive this nested call.
  runWithContext({ organizationId: user.organizationId }, next);
}
