import type {
  ListAttendanceRecordsParams,
  ListAttendanceSessionsParams,
} from '../schemas/attendance.schema';

export const attendanceKeys = {
  all: () => ['attendance'] as const,
  sessions: () => [...attendanceKeys.all(), 'sessions'] as const,
  sessionsList: (params?: ListAttendanceSessionsParams) =>
    [...attendanceKeys.sessions(), params ?? {}] as const,
  sessionDetail: (id: string) => [...attendanceKeys.sessions(), 'detail', id] as const,
  records: () => [...attendanceKeys.all(), 'records'] as const,
  recordsList: (params?: ListAttendanceRecordsParams) =>
    [...attendanceKeys.records(), params ?? {}] as const,
};
