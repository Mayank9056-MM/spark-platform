import {
  type AuditLog,
  auditLogSchema,
  type ListAuditLogsParams,
} from '../schemas/audit-log.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest } from '@/lib/api/http-client';

export function getAuditLogs(
  params: ListAuditLogsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<AuditLog>> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.action) query.set('action', params.action);
  if (params.entityType) query.set('entityType', params.entityType);
  if (params.entityId) query.set('entityId', params.entityId);
  if (params.actorUserId) query.set('actorUserId', params.actorUserId);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const queryString = query.toString();
  const path = `/audit-logs${queryString ? `?${queryString}` : ''}`;

  return apiPaginatedRequest(path, auditLogSchema, { signal });
}
