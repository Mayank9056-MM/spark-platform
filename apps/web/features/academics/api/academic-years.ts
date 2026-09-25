import {
  type AcademicYear,
  academicYearSchema,
  type CreateAcademicYearFormValues,
} from '../schemas/academic.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest, apiRequest } from '@/lib/api/http-client';

export interface ListAcademicYearsParams {
  page?: number;
  limit?: number;
  sortBy?: 'startDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export function getAcademicYears(
  params?: ListAcademicYearsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<AcademicYear>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/academic/academic-years${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, academicYearSchema, { method: 'GET', signal });
}

export function getAcademicYear(id: string, signal?: AbortSignal): Promise<AcademicYear> {
  return apiRequest(`/academic/academic-years/${id}`, academicYearSchema, {
    method: 'GET',
    signal,
  });
}

export function createAcademicYear(
  payload: CreateAcademicYearFormValues,
  signal?: AbortSignal,
): Promise<AcademicYear> {
  return apiRequest('/academic/academic-years', academicYearSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}

export function activateAcademicYear(id: string, signal?: AbortSignal): Promise<AcademicYear> {
  return apiRequest(`/academic/academic-years/${id}/activate`, academicYearSchema, {
    method: 'POST',
    signal,
  });
}
