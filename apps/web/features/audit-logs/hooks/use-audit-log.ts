'use client';

import { useQuery } from '@tanstack/react-query';

import { getAuditLog } from '../api/get-audit-log';

import { auditLogKeys } from './audit-log-keys';

export function useAuditLog(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? auditLogKeys.detail(id) : (['audit-logs', 'detail', 'none'] as const),
    queryFn: ({ signal }) => {
      if (!id) throw new Error('Audit log ID is required');
      return getAuditLog(id, signal);
    },
    enabled: Boolean(id),
  });
}
