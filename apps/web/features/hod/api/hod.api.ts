import { z } from 'zod';

import {
  type CreateHodFacultyAssignmentInput,
  type CreateHodTimetableEntryInput,
  type HodAttendanceSummary,
  type HodCourseOffering,
  type HodFacultyMember,
  type HodOverview,
  type HodProfile,
  type HodStudentsList,
  type HodTimetableEntry,
  type HodTimetableSchedulingOptions,
  createHodFacultyAssignmentSchema,
  createHodTimetableEntrySchema,
  hodAttendanceSummarySchema,
  hodCourseOfferingSchema,
  hodFacultyMemberSchema,
  hodOverviewSchema,
  hodProfileSchema,
  hodPromotionBatchSchema,
  hodStudentsListSchema,
  hodTimetableEntrySchema,
  hodTimetableSchedulingOptionsSchema,
} from '../schemas/hod.schema';

import { apiRequest } from '@/lib/api/http-client';

export interface ListHodStudentsParams {
  page?: number;
  limit?: number;
  programId?: string;
  status?: string;
  search?: string;
}

export interface ListHodTimetableParams {
  dayOfWeek?: string;
  programId?: string;
}

export function getHodProfile(signal?: AbortSignal): Promise<HodProfile> {
  return apiRequest('/hod/profile', hodProfileSchema, {
    method: 'GET',
    signal,
  });
}

export function getHodOverview(signal?: AbortSignal): Promise<HodOverview> {
  return apiRequest('/hod/overview', hodOverviewSchema, {
    method: 'GET',
    signal,
  });
}

export function getHodFaculty(signal?: AbortSignal): Promise<HodFacultyMember[]> {
  return apiRequest('/hod/faculty', z.array(hodFacultyMemberSchema), {
    method: 'GET',
    signal,
  });
}

export function getHodCourseOfferings(signal?: AbortSignal): Promise<HodCourseOffering[]> {
  return apiRequest('/hod/offerings', z.array(hodCourseOfferingSchema), {
    method: 'GET',
    signal,
  });
}

export function getHodStudents(
  params?: ListHodStudentsParams,
  signal?: AbortSignal,
): Promise<HodStudentsList> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.programId) searchParams.set('programId', params.programId);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const endpoint = query ? `/hod/students?${query}` : '/hod/students';

  return apiRequest(endpoint, hodStudentsListSchema, {
    method: 'GET',
    signal,
  });
}

export function getHodTimetable(
  params?: ListHodTimetableParams,
  signal?: AbortSignal,
): Promise<HodTimetableEntry[]> {
  const searchParams = new URLSearchParams();
  if (params?.dayOfWeek) searchParams.set('dayOfWeek', params.dayOfWeek);
  if (params?.programId) searchParams.set('programId', params.programId);

  const query = searchParams.toString();
  const endpoint = query ? `/hod/timetable?${query}` : '/hod/timetable';

  return apiRequest(endpoint, z.array(hodTimetableEntrySchema), {
    method: 'GET',
    signal,
  });
}

export function getHodTimetableOptions(
  signal?: AbortSignal,
): Promise<HodTimetableSchedulingOptions> {
  return apiRequest('/hod/timetable/options', hodTimetableSchedulingOptionsSchema, {
    method: 'GET',
    signal,
  });
}

export function getHodAttendance(signal?: AbortSignal): Promise<HodAttendanceSummary> {
  return apiRequest('/hod/attendance', hodAttendanceSummarySchema, {
    method: 'GET',
    signal,
  });
}

export function getHodPromotions(signal?: AbortSignal) {
  return apiRequest('/hod/promotions', z.array(hodPromotionBatchSchema), {
    method: 'GET',
    signal,
  });
}

export function createHodFacultyAssignment(
  payload: CreateHodFacultyAssignmentInput,
): Promise<unknown> {
  const validated = createHodFacultyAssignmentSchema.parse(payload);
  return apiRequest('/hod/assignments', z.unknown(), {
    method: 'POST',
    body: validated,
  });
}

export function createHodTimetableEntry(payload: CreateHodTimetableEntryInput): Promise<unknown> {
  const validated = createHodTimetableEntrySchema.parse(payload);
  return apiRequest('/hod/timetable', z.unknown(), {
    method: 'POST',
    body: validated,
  });
}
