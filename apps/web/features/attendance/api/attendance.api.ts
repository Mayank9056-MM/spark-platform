import {
  type AttendanceRecord,
  type AttendanceSession,
  attendanceRecordSchema,
  attendanceSessionSchema,
  type ListAttendanceRecordsParams,
  type ListAttendanceSessionsParams,
} from '../schemas/attendance.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest, apiRequest } from '@/lib/api/http-client';

export function listAttendanceSessions(
  params?: ListAttendanceSessionsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<AttendanceSession>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.lectureId) query.set('lectureId', params.lectureId);
  if (params?.takenByUserId) query.set('takenByUserId', params.takenByUserId);
  if (params?.status) query.set('status', params.status);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/attendances${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, attendanceSessionSchema, { method: 'GET', signal });
}

export function listAttendanceRecords(
  params?: ListAttendanceRecordsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<AttendanceRecord>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.attendanceSessionId) query.set('attendanceSessionId', params.attendanceSessionId);
  if (params?.semesterEnrollmentId) query.set('semesterEnrollmentId', params.semesterEnrollmentId);
  if (params?.status) query.set('status', params.status);
  if (params?.markedByUserId) query.set('markedByUserId', params.markedByUserId);
  if (params?.correctedByUserId) query.set('correctedByUserId', params.correctedByUserId);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/attendances/records${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, attendanceRecordSchema, { method: 'GET', signal });
}

export function getAttendanceSession(id: string, signal?: AbortSignal): Promise<AttendanceSession> {
  return apiRequest(`/attendances/${id}`, attendanceSessionSchema, {
    method: 'GET',
    signal,
  });
}
