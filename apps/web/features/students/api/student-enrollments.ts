import {
  type CancelStudentEnrollmentInput,
  type CreateStudentEnrollmentInput,
  type ListStudentEnrollmentsParams,
  type StudentEnrollment,
  studentEnrollmentSchema,
  type WithdrawStudentEnrollmentInput,
} from '../schemas/student.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest, apiRequest } from '@/lib/api/http-client';

export function listStudentEnrollments(
  params?: ListStudentEnrollmentsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<StudentEnrollment>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.programId) query.set('programId', params.programId);
  if (params?.curriculumVersionId) query.set('curriculumVersionId', params.curriculumVersionId);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/student-enrollments${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, studentEnrollmentSchema, { method: 'GET', signal });
}

export function getStudentEnrollment(id: string, signal?: AbortSignal): Promise<StudentEnrollment> {
  return apiRequest(`/student-enrollments/${id}`, studentEnrollmentSchema, {
    method: 'GET',
    signal,
  });
}

export function createStudentEnrollment(
  payload: CreateStudentEnrollmentInput,
  signal?: AbortSignal,
): Promise<StudentEnrollment> {
  return apiRequest('/student-enrollments', studentEnrollmentSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}

export function cancelStudentEnrollment(
  id: string,
  payload: CancelStudentEnrollmentInput,
  signal?: AbortSignal,
): Promise<StudentEnrollment> {
  return apiRequest(`/student-enrollments/${id}/cancel`, studentEnrollmentSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}

export function withdrawStudentEnrollment(
  id: string,
  payload: WithdrawStudentEnrollmentInput,
  signal?: AbortSignal,
): Promise<StudentEnrollment> {
  return apiRequest(`/student-enrollments/${id}/withdraw`, studentEnrollmentSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}
