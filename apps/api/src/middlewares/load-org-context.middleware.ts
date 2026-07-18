import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../common/errors/ApiError.js';
import { ErrorCode } from '../common/errors/ErrorCodes.js';
import { prisma } from '../lib/prisma.js';

export async function loadOrganizationContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    next(ApiError.unauthorized('Authentication required', ErrorCode.UNAUTHENTICATED));
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { organizationId: true },
  });

  if (!user) {
    next(ApiError.unauthorized('User not found', ErrorCode.UNAUTHENTICATED));
    return;
  }

  req.user.organizationId = user.organizationId;
  next();
}
