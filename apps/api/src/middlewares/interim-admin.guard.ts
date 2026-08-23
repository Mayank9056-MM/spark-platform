import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../common/errors/ApiError.js';
import { prisma } from '../lib/prisma.js';

const ADMIN_ROLE_KEYS = ['admin', 'super_admin'];

/**
 * TEMPORARY STOPGAP — delete this file the day the RBAC module's real
 * can(user, action, scope) engine exists. This performs one narrow check
 * ("does this user hold an admin/super_admin RoleAssignment, right now, in
 * THIS organization") directly against RoleAssignment/Role, bypassing any
 * real permission matrix.
 *
 * Do NOT extend this with more roles or finer-grained checks. Any
 * additional authorization complexity beyond this one boolean is a sign
 * RBAC needs to be built now, not that this stopgap should grow.
 *
 * Tenant-safety note: the composite foreign keys on RoleAssignment
 * (role_assignments_organizationId_userId_fkey,
 * role_assignments_organizationId_roleId_fkey) already make it physically
 * impossible in Postgres for a RoleAssignment row's organizationId to
 * disagree with its User's or Role's organizationId. The explicit
 * `organizationId: req.user.organizationId` filter below is not closing a
 * live cross-tenant escalation hole — the schema already prevents that data
 * from existing — but it's still required: it's what makes the QUERY itself
 * express "admin in this tenant," rather than depending silently on a
 * database constraint someone could weaken later without this file
 * noticing. Same reasoning applies to `role.deletedAt: null` and
 * `validFrom`: the schema can't express "and this specific assignment/role
 * is currently valid," only "if it exists, it's tenant-consistent" — that
 * validity check has to live here.
 */
export async function requireInterimAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.user?.id;
  const organizationId = req.user?.organizationId;

  if (!userId || !organizationId) {
    // organizationId is populated by loadOrganizationContext, which must
    // run before this guard on every route — if it's missing, that's a
    // route-wiring bug, not a legitimate unauthenticated request.
    next(ApiError.unauthorized('Authentication required'));
    return;
  }

  const now = new Date();

  const assignment = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      organizationId,
      role: {
        key: { in: ADMIN_ROLE_KEYS },
        deletedAt: null,
      },
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
    },
  });

  if (!assignment) {
    next(ApiError.forbidden('Admin privileges required'));
    return;
  }

  next();
}
