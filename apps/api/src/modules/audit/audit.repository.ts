import type { Prisma, PrismaClient } from '@spark/database';
import { Prisma as PrismaNS } from '@spark/database';

import { prisma } from '../../lib/prisma.js';

import type { AuditLogRow } from './audit.mapper.js';
import type {
  ListAuditLogsFilters,
  ListAuditLogsOptions,
  RecordAuditInput,
} from './audit.types.js';

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

  async findMany(
    filters: ListAuditLogsFilters,
    options: ListAuditLogsOptions,
  ): Promise<{ logs: AuditLogRow[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.actorUserId && { actorUserId: filters.actorUserId }),
      ...(filters.action && { action: filters.action }),
      ...(filters.entityType && {
        entityType: { contains: filters.entityType, mode: 'insensitive' },
      }),
      ...(filters.entityId && { entityId: filters.entityId }),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom && { gte: filters.dateFrom }),
              ...(filters.dateTo && { lte: filters.dateTo }),
            },
          }
        : {}),
      ...(filters.search && {
        OR: [
          { entityId: { contains: filters.search, mode: 'insensitive' } },
          { entityType: { contains: filters.search, mode: 'insensitive' } },
          { requestId: { contains: filters.search, mode: 'insensitive' } },
          { ipAddress: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const sortOrder = options.sortOrder ?? 'desc';

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [{ createdAt: sortOrder }, { id: sortOrder }],
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async findById(id: string): Promise<AuditLogRow | null> {
    return prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }
}

export const auditRepository = new AuditRepository();
