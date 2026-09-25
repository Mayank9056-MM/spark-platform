import { z } from 'zod';

import {
  type StudentAcademics,
  type StudentAttendanceSummary,
  type StudentProfile,
  type StudentProgress,
  type StudentSubject,
  type StudentTimetableEntry,
  type UpdateStudentProfileInput,
  studentAcademicsSchema,
  studentAttendanceSummarySchema,
  studentProfileSchema,
  studentProgressSchema,
  studentSubjectSchema,
  studentTimetableEntrySchema,
} from '../schemas/student.schema';

import { apiRequest } from '@/lib/api/http-client';

export function getStudentProfile(signal?: AbortSignal): Promise<StudentProfile> {
  return apiRequest('/student/me', studentProfileSchema, {
    method: 'GET',
    signal,
  });
}

export function updateStudentProfile(
  payload: UpdateStudentProfileInput,
  signal?: AbortSignal,
): Promise<StudentProfile> {
  return apiRequest('/student/me/profile', studentProfileSchema, {
    method: 'PATCH',
    body: payload,
    signal,
  });
}

export function getStudentAcademics(signal?: AbortSignal): Promise<StudentAcademics> {
  return apiRequest('/student/me/academics', studentAcademicsSchema, {
    method: 'GET',
    signal,
  });
}

export function getStudentSubjects(signal?: AbortSignal): Promise<StudentSubject[]> {
  return apiRequest('/student/me/subjects', z.array(studentSubjectSchema), {
    method: 'GET',
    signal,
  });
}

export function getStudentAttendance(signal?: AbortSignal): Promise<StudentAttendanceSummary> {
  return apiRequest('/student/me/attendance', studentAttendanceSummarySchema, {
    method: 'GET',
    signal,
  });
}

export function getStudentTimetable(signal?: AbortSignal): Promise<StudentTimetableEntry[]> {
  return apiRequest('/student/me/timetable', z.array(studentTimetableEntrySchema), {
    method: 'GET',
    signal,
  });
}

export function getStudentProgress(signal?: AbortSignal): Promise<StudentProgress> {
  return apiRequest('/student/me/progress', studentProgressSchema, {
    method: 'GET',
    signal,
  });
}
