import { z } from 'zod';

import {
  type CreateElectiveGroupFormValues,
  type ElectiveGroup,
  electiveGroupSchema,
  type UpdateElectiveGroupFormValues,
} from '../schemas/academic.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest, apiRequest } from '@/lib/api/http-client';

const deleteResponseSchema = z
  .null()
  .optional()
  .or(
    z.object({
      success: z.boolean().optional(),
    }),
  );

export interface ListElectiveGroupsParams {
  page?: number;
  limit?: number;
  search?: string;
  semesterCatalogId?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export function getElectiveGroups(
  params?: ListElectiveGroupsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<ElectiveGroup>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.semesterCatalogId) query.set('semesterCatalogId', params.semesterCatalogId);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/academic/electives${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, electiveGroupSchema, { method: 'GET', signal });
}

export function getElectiveGroup(id: string, signal?: AbortSignal): Promise<ElectiveGroup> {
  return apiRequest(`/academic/electives/${id}`, electiveGroupSchema, { method: 'GET', signal });
}

export function createElectiveGroup(
  payload: CreateElectiveGroupFormValues,
  signal?: AbortSignal,
): Promise<ElectiveGroup> {
  return apiRequest('/academic/electives', electiveGroupSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}

export function updateElectiveGroup(
  id: string,
  payload: UpdateElectiveGroupFormValues,
  signal?: AbortSignal,
): Promise<ElectiveGroup> {
  return apiRequest(`/academic/electives/${id}`, electiveGroupSchema, {
    method: 'PATCH',
    body: payload,
    signal,
  });
}

export function deleteElectiveGroup(
  id: string,
  signal?: AbortSignal,
): Promise<{ success?: boolean } | null | undefined> {
  return apiRequest(`/academic/electives/${id}`, deleteResponseSchema, {
    method: 'DELETE',
    signal,
  });
}
