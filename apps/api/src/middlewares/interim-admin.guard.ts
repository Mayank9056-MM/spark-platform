import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../common/errors/ApiError.js';
import { prisma } from '../lib/prisma.js';

const ADMIN_ROLE_KEYS = ['admin', 'super_admin'];

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

  const now = new Date();

  const assignment = await prisma.roleAssignment.findFirst({
    where: {
      userId,
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
