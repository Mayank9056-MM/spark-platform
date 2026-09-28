import {
  type CreateTimetableInput,
  type ListTimetablesParams,
  type TimetableEntry,
  timetableSchema,
} from '../schemas/timetable.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest, apiRequest } from '@/lib/api/http-client';

export function listTimetables(
  params?: ListTimetablesParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<TimetableEntry>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.subjectOfferingId) query.set('subjectOfferingId', params.subjectOfferingId);
  if (params?.subjectComponentId) query.set('subjectComponentId', params.subjectComponentId);
  if (params?.facultyAssignmentId) query.set('facultyAssignmentId', params.facultyAssignmentId);
  if (params?.semesterCatalogId) query.set('semesterCatalogId', params.semesterCatalogId);
  if (params?.academicYearId) query.set('academicYearId', params.academicYearId);
  if (params?.timeSlotId) query.set('timeSlotId', params.timeSlotId);
  if (params?.roomId) query.set('roomId', params.roomId);
  if (params?.dayOfWeek) query.set('dayOfWeek', params.dayOfWeek);
  if (params?.isCancelled !== undefined) query.set('isCancelled', String(params.isCancelled));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/timetables${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, timetableSchema, { method: 'GET', signal });
}

export function getTimetableById(id: string, signal?: AbortSignal): Promise<TimetableEntry> {
  return apiRequest(`/timetables/${id}`, timetableSchema, {
    method: 'GET',
    signal,
  });
}

export function createTimetable(
  payload: CreateTimetableInput,
  signal?: AbortSignal,
): Promise<TimetableEntry> {
  return apiRequest('/timetables', timetableSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}
