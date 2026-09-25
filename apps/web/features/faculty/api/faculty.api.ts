import { z } from 'zod';

import {
  type FacultyAssignment,
  type FacultyAttendanceSummary,
  type FacultyLecture,
  type FacultyLectureRoster,
  type FacultyProfile,
  type FacultyTimetableEntry,
  type SubmitAttendanceInput,
  facultyAssignmentSchema,
  facultyAttendanceSummarySchema,
  facultyLectureRosterSchema,
  facultyLectureSchema,
  facultyProfileSchema,
  facultyTimetableEntrySchema,
} from '../schemas/faculty.schema';

import { apiRequest } from '@/lib/api/http-client';

export interface ListFacultyLecturesParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export function getFacultyProfile(signal?: AbortSignal): Promise<FacultyProfile> {
  return apiRequest('/faculty/me', facultyProfileSchema, {
    method: 'GET',
    signal,
  });
}

export function getFacultyAssignments(signal?: AbortSignal): Promise<FacultyAssignment[]> {
  return apiRequest('/faculty/me/assignments', z.array(facultyAssignmentSchema), {
    method: 'GET',
    signal,
  });
}

export function getFacultyTimetable(signal?: AbortSignal): Promise<FacultyTimetableEntry[]> {
  return apiRequest('/faculty/me/timetable', z.array(facultyTimetableEntrySchema), {
    method: 'GET',
    signal,
  });
}

export function getFacultyLectures(
  params?: ListFacultyLecturesParams,
  signal?: AbortSignal,
): Promise<FacultyLecture[]> {
  const searchParams = new URLSearchParams();
  if (params?.date) searchParams.set('date', params.date);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  const endpoint = query ? `/faculty/me/lectures?${query}` : '/faculty/me/lectures';

  return apiRequest(endpoint, z.array(facultyLectureSchema), {
    method: 'GET',
    signal,
  });
}

export function getFacultyLectureRoster(
  lectureId: string,
  signal?: AbortSignal,
): Promise<FacultyLectureRoster> {
  return apiRequest(`/faculty/me/lectures/${lectureId}/roster`, facultyLectureRosterSchema, {
    method: 'GET',
    signal,
  });
}

export function submitFacultyAttendance(
  lectureId: string,
  payload: SubmitAttendanceInput,
  signal?: AbortSignal,
): Promise<FacultyLectureRoster> {
  return apiRequest(`/faculty/me/lectures/${lectureId}/attendance`, facultyLectureRosterSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}

export function getFacultyAttendanceSummary(
  signal?: AbortSignal,
): Promise<FacultyAttendanceSummary> {
  return apiRequest('/faculty/me/attendance/summary', facultyAttendanceSummarySchema, {
    method: 'GET',
    signal,
  });
}
