import {
  type CreateFacultyAssignmentInput,
  type FacultyAssignment,
  facultyAssignmentSchema,
  type ListFacultyAssignmentsParams,
} from '../schemas/faculty-assignment.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest, apiRequest } from '@/lib/api/http-client';

export function listFacultyAssignments(
  params?: ListFacultyAssignmentsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<FacultyAssignment>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.subjectOfferingId) query.set('subjectOfferingId', params.subjectOfferingId);
  if (params?.subjectComponentId) query.set('subjectComponentId', params.subjectComponentId);
  if (params?.facultyUserId) query.set('facultyUserId', params.facultyUserId);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/faculty-assignments${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, facultyAssignmentSchema, { method: 'GET', signal });
}

export function getFacultyAssignment(id: string, signal?: AbortSignal): Promise<FacultyAssignment> {
  return apiRequest(`/faculty-assignments/${id}`, facultyAssignmentSchema, {
    method: 'GET',
    signal,
  });
}

export function createFacultyAssignment(
  payload: CreateFacultyAssignmentInput,
  signal?: AbortSignal,
): Promise<FacultyAssignment> {
  return apiRequest('/faculty-assignments', facultyAssignmentSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}
