import { AuditAction } from '@spark/database/client';
import { z } from 'zod';

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  actorUserId: z.string().uuid().optional(),
  action: z.enum(AuditAction).optional(),
  entityType: z.string().trim().min(1).max(100).optional(),
  entityId: z.string().trim().min(1).max(100).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

export const auditLogIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type AuditLogIdParams = z.infer<typeof auditLogIdParamsSchema>;
