import type { Prisma, PrismaClient } from '@spark/database';
import { Prisma as PrismaNS } from '@spark/database';

import { prisma } from '../../lib/prisma.js';

import type { RecordAuditInput } from './audit.types.js';

type Db = PrismaClient | Prisma.TransactionClient;

export class AuditRepository {
  /**
   * `db` defaults to the module-level singleton for the fire-and-forget
   * path (audit.service.ts's `record`), and is passed explicitly as a
   * transaction client for `recordTx` — this is what makes the audit write
   * genuinely part of the caller's transaction rather than a separate
   * connection/statement that could succeed or fail independently.
   */
  async create(input: RecordAuditInput, db: Db = prisma): Promise<void> {
    await db.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValue: input.oldValue ?? PrismaNS.JsonNull,
        newValue: input.newValue ?? PrismaNS.JsonNull,
        requestId: input.requestId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }
}

export const auditRepository = new AuditRepository();
