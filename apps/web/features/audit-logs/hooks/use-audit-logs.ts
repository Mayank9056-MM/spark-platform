'use client';

import { useQuery } from '@tanstack/react-query';

import { getAuditLogs } from '../api/get-audit-logs';
import type { ListAuditLogsParams } from '../schemas/audit-log.schema';

import { auditLogKeys } from './audit-log-keys';

export function useAuditLogs(params: ListAuditLogsParams = {}) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: ({ signal }) => getAuditLogs(params, signal),
  });
}
