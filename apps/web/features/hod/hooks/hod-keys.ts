import type { ListHodStudentsParams, ListHodTimetableParams } from '../api/hod.api';

export const hodKeys = {
  all: ['hod'] as const,
  profile: () => [...hodKeys.all, 'profile'] as const,
  overview: () => [...hodKeys.all, 'overview'] as const,
  faculty: () => [...hodKeys.all, 'faculty'] as const,
  students: (filters?: ListHodStudentsParams) =>
    [...hodKeys.all, 'students', filters ?? {}] as const,
  timetable: (filters?: ListHodTimetableParams) =>
    [...hodKeys.all, 'timetable', filters ?? {}] as const,
  attendance: () => [...hodKeys.all, 'attendance'] as const,
  promotions: () => [...hodKeys.all, 'promotions'] as const,
  offerings: () => [...hodKeys.all, 'offerings'] as const,
  timetableOptions: () => [...hodKeys.all, 'timetableOptions'] as const,
};
