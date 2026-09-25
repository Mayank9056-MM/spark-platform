import {
  type CreateProgramFormValues,
  type Program,
  programSchema,
} from '../schemas/academic.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest, apiRequest } from '@/lib/api/http-client';

export interface ListProgramsParams {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  sortBy?: 'name' | 'code' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export function getPrograms(
  params?: ListProgramsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<Program>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.departmentId) query.set('departmentId', params.departmentId);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/academic/programs${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, programSchema, { method: 'GET', signal });
}

export function getProgram(id: string, signal?: AbortSignal): Promise<Program> {
  return apiRequest(`/academic/programs/${id}`, programSchema, { method: 'GET', signal });
}

export function createProgram(
  payload: CreateProgramFormValues,
  signal?: AbortSignal,
): Promise<Program> {
  return apiRequest('/academic/programs', programSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}
