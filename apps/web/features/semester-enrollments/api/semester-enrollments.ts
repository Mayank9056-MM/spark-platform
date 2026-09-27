import {
  type CreateSemesterEnrollmentInput,
  type ListSemesterEnrollmentsParams,
  type SemesterEnrollment,
  semesterEnrollmentSchema,
} from '../schemas/semester-enrollment.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest, apiRequest } from '@/lib/api/http-client';

export function listSemesterEnrollments(
  params?: ListSemesterEnrollmentsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<SemesterEnrollment>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.studentEnrollmentId) query.set('studentEnrollmentId', params.studentEnrollmentId);
  if (params?.semesterCatalogId) query.set('semesterCatalogId', params.semesterCatalogId);
  if (params?.academicYearId) query.set('academicYearId', params.academicYearId);
  if (params?.attemptNumber !== undefined) query.set('attemptNumber', String(params.attemptNumber));
  if (params?.status) query.set('status', params.status);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/semester-enrollments${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, semesterEnrollmentSchema, { method: 'GET', signal });
}

export function getSemesterEnrollment(
  id: string,
  signal?: AbortSignal,
): Promise<SemesterEnrollment> {
  return apiRequest(`/semester-enrollments/${id}`, semesterEnrollmentSchema, {
    method: 'GET',
    signal,
  });
}

export function createSemesterEnrollment(
  payload: CreateSemesterEnrollmentInput,
  signal?: AbortSignal,
): Promise<SemesterEnrollment> {
  return apiRequest('/semester-enrollments', semesterEnrollmentSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}
