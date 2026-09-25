import { type PermissionItem, permissionItemSchema } from '@/features/roles/schemas/role.schema';
import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest } from '@/lib/api/http-client';

export interface ListPermissionsParams {
  page?: number;
  limit?: number;
  search?: string;
  resource?: string;
  action?: string;
  sortBy?: 'key' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export function getPermissions(
  params?: ListPermissionsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<PermissionItem>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.resource) query.set('resource', params.resource);
  if (params?.action) query.set('action', params.action);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/rbac/permissions${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, permissionItemSchema, { method: 'GET', signal });
}
