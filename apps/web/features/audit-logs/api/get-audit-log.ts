import { type AuditLog, auditLogSchema } from '../schemas/audit-log.schema';

import { apiRequest } from '@/lib/api/http-client';

export function getAuditLog(id: string, signal?: AbortSignal): Promise<AuditLog> {
  return apiRequest(`/audit-logs/${encodeURIComponent(id)}`, auditLogSchema, { signal });
}
