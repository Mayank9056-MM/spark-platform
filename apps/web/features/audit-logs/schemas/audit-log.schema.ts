import { z } from 'zod';

export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'ARCHIVE',
  'RESTORE',
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'LOGOUT_ALL_DEVICES',
  'SESSION_REVOKED',
  'ACCOUNT_ACTIVATED',
  'PASSWORD_CHANGED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'ROLE_GRANTED',
  'ROLE_REVOKED',
  'PERMISSION_CHANGED',
  'OTHER',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number] | (string & {});

export const auditActionSchema = z.string();

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
  oldValue: z.unknown().nullable().optional(),
  newValue: z.unknown().nullable().optional(),
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
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: 'asc' | 'desc';
}
