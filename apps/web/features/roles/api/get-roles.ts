import { type RoleItem, roleItemSchema } from '../schemas/role.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest } from '@/lib/api/http-client';

export interface ListRolesParams {
  page?: number;
  limit?: number;
  search?: string;
  isSystemDefined?: boolean;
  sortBy?: 'createdAt' | 'key' | 'displayName';
  sortOrder?: 'asc' | 'desc';
}

export function getRoles(
  params?: ListRolesParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<RoleItem>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.isSystemDefined !== undefined) {
    query.set('isSystemDefined', String(params.isSystemDefined));
  }
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/rbac/roles${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, roleItemSchema, { method: 'GET', signal });
}
