import type { ListFacultyLecturesParams } from '../api/faculty.api';

export const facultyKeys = {
  all: ['faculty'] as const,
  profile: () => [...facultyKeys.all, 'profile'] as const,
  assignments: () => [...facultyKeys.all, 'assignments'] as const,
  timetable: () => [...facultyKeys.all, 'timetable'] as const,
  lectures: (filters?: ListFacultyLecturesParams) =>
    [...facultyKeys.all, 'lectures', filters ?? {}] as const,
  roster: (lectureId: string) => [...facultyKeys.all, 'roster', lectureId] as const,
  attendanceSummary: () => [...facultyKeys.all, 'attendance-summary'] as const,
};
