import { z } from 'zod';

export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'ARCHIVE'] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const auditActionSchema = z.enum(AUDIT_ACTIONS);

export const auditLogActorSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable().optional(),
});

export type AuditLogActor = z.infer<typeof auditLogActorSchema>;

export const auditLogSchema = z.object({
  id: z.string(),
  actorUserId: z.string().nullable().optional(),
  actor: auditLogActorSchema.nullable().optional(),
  action: auditActionSchema,
  entityType: z.string(),
  entityId: z.string(),
  oldValue: z.record(z.string(), z.unknown()).nullable().optional(),
  newValue: z.record(z.string(), z.unknown()).nullable().optional(),
  requestId: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: 'asc' | 'desc';
}
