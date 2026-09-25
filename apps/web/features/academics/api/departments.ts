import { z } from 'zod';

import {
  type CreateDepartmentFormValues,
  type Department,
  departmentSchema,
  type UpdateDepartmentFormValues,
} from '../schemas/academic.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest, apiRequest } from '@/lib/api/http-client';

export interface ListDepartmentsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'code' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

const deleteResponseSchema = z.object({
  success: z.boolean().optional(),
});

export function getDepartments(
  params?: ListDepartmentsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<Department>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/academic/departments${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, departmentSchema, { method: 'GET', signal });
}

export function getDepartment(id: string, signal?: AbortSignal): Promise<Department> {
  return apiRequest(`/academic/departments/${id}`, departmentSchema, { method: 'GET', signal });
}

export function createDepartment(
  payload: CreateDepartmentFormValues,
  signal?: AbortSignal,
): Promise<Department> {
  return apiRequest('/academic/departments', departmentSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}

export function updateDepartment(
  id: string,
  payload: UpdateDepartmentFormValues,
  signal?: AbortSignal,
): Promise<Department> {
  return apiRequest(`/academic/departments/${id}`, departmentSchema, {
    method: 'PATCH',
    body: payload,
    signal,
  });
}

export function deleteDepartment(id: string, signal?: AbortSignal): Promise<{ success?: boolean }> {
  return apiRequest(`/academic/departments/${id}`, deleteResponseSchema, {
    method: 'DELETE',
    signal,
  });
}
