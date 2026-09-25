import { z } from 'zod';

import {
  type CreateSubjectFormValues,
  type Subject,
  subjectSchema,
  type UpdateSubjectFormValues,
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

export interface ListSubjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  semesterCatalogId?: string;
  electiveGroupId?: string;
  isElective?: boolean;
  sortBy?: 'code' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export function getSubjects(
  params?: ListSubjectsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<Subject>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.semesterCatalogId) query.set('semesterCatalogId', params.semesterCatalogId);
  if (params?.electiveGroupId) query.set('electiveGroupId', params.electiveGroupId);
  if (params?.isElective !== undefined) query.set('isElective', String(params.isElective));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/academic/subjects${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, subjectSchema, { method: 'GET', signal });
}

export function getSubject(id: string, signal?: AbortSignal): Promise<Subject> {
  return apiRequest(`/academic/subjects/${id}`, subjectSchema, { method: 'GET', signal });
}

export function createSubject(
  payload: CreateSubjectFormValues,
  signal?: AbortSignal,
): Promise<Subject> {
  return apiRequest('/academic/subjects', subjectSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}

export function updateSubject(
  id: string,
  payload: UpdateSubjectFormValues,
  signal?: AbortSignal,
): Promise<Subject> {
  return apiRequest(`/academic/subjects/${id}`, subjectSchema, {
    method: 'PATCH',
    body: payload,
    signal,
  });
}

export function deleteSubject(
  id: string,
  signal?: AbortSignal,
): Promise<{ success?: boolean } | null | undefined> {
  return apiRequest(`/academic/subjects/${id}`, deleteResponseSchema, {
    method: 'DELETE',
    signal,
  });
}
