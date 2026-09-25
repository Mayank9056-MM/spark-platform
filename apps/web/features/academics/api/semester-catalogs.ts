import { z } from 'zod';

import {
  type CreateSemesterCatalogFormValues,
  type SemesterCatalog,
  semesterCatalogSchema,
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

export interface ListSemesterCatalogsParams {
  page?: number;
  limit?: number;
  curriculumVersionId?: string;
  number?: number;
  sortBy?: 'number' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export function getSemesterCatalogs(
  params?: ListSemesterCatalogsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<SemesterCatalog>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.curriculumVersionId) query.set('curriculumVersionId', params.curriculumVersionId);
  if (params?.number) query.set('number', String(params.number));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/academic/semester-catalogs${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, semesterCatalogSchema, { method: 'GET', signal });
}

export function getSemesterCatalog(id: string, signal?: AbortSignal): Promise<SemesterCatalog> {
  return apiRequest(`/academic/semester-catalogs/${id}`, semesterCatalogSchema, {
    method: 'GET',
    signal,
  });
}

export function createSemesterCatalog(
  payload: CreateSemesterCatalogFormValues,
  signal?: AbortSignal,
): Promise<SemesterCatalog> {
  return apiRequest('/academic/semester-catalogs', semesterCatalogSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}

export function deleteSemesterCatalog(
  id: string,
  signal?: AbortSignal,
): Promise<{ success?: boolean } | null | undefined> {
  return apiRequest(`/academic/semester-catalogs/${id}`, deleteResponseSchema, {
    method: 'DELETE',
    signal,
  });
}
