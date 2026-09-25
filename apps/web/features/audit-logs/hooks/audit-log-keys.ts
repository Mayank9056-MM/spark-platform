import type { ListAuditLogsParams } from '../schemas/audit-log.schema';

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (params: ListAuditLogsParams) => [...auditLogKeys.lists(), params] as const,
  details: () => [...auditLogKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditLogKeys.details(), id] as const,
};
