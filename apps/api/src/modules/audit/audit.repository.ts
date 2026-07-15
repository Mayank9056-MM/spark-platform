import { Prisma } from '@spark/database';

import { prisma } from '../../lib/prisma.js';

import type { RecordAuditInput } from './audit.types.js';

export class AuditRepository {
  async create(input: RecordAuditInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValue: input.oldValue ?? Prisma.JsonNull,
        newValue: input.newValue ?? Prisma.JsonNull,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }
}

export const auditRepository = new AuditRepository();
