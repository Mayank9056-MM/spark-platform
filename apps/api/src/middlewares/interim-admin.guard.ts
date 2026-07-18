import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../common/errors/ApiError.js';
import { prisma } from '../lib/prisma.js';

const ADMIN_ROLE_KEYS = ['admin', 'super_admin'];

/**
 * TEMPORARY STOPGAP — delete this file the day the RBAC module's real
 * can(user, action, scope) engine exists. This performs one narrow check
 * ("does this user hold an admin/super_admin RoleAssignment, right now,
 * anywhere in their org") directly against RoleAssignment/Role, bypassing
 * any real permission matrix.
 *
 * It exists only because leaving User-module mutation routes — create,
 * list, update-by-id, archive — reachable by ANY authenticated user is
 * not an acceptable gap for endpoints that create identities and expose
 * every user's PII in an organization, even for a short interim period.
 *
 * Do NOT extend this with more roles or finer-grained checks. Any
 * additional authorization complexity beyond this one boolean is a sign
 * RBAC needs to be built now, not that this stopgap should grow.
 *
 * KNOWN DEPENDENCY: this assumes an 'admin' or 'super_admin' Role.key
 * exists, seeded per organization. No seed script exists yet as of this
 * writing — until one does, every route behind this guard will 403 for
 * everyone, with no way to bootstrap the first admin. Building that seed
 * script is a prerequisite to testing this module end-to-end, not
 * optional polish.
 */
export async function requireInterimAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    next(ApiError.unauthorized('Authentication required'));
    return;
  }

  const assignment = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      role: { key: { in: ADMIN_ROLE_KEYS } },
      OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
    },
  });

  if (!assignment) {
    next(ApiError.forbidden('Admin privileges required'));
    return;
  }

  next();
}
