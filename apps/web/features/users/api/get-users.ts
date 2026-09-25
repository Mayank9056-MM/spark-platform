import { type ListUsersParams, type UserProfile, userProfileSchema } from '../schemas/user.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest } from '@/lib/api/http-client';

export function getUsers(
  params: ListUsersParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<UserProfile>> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const queryString = query.toString();
  const path = `/users${queryString ? `?${queryString}` : ''}`;

  return apiPaginatedRequest(path, userProfileSchema, { signal });
}
