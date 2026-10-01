'use client';

import { useQuery } from '@tanstack/react-query';

import {
  getAttendanceSession,
  listAttendanceRecords,
  listAttendanceSessions,
} from '../api/attendance.api';
import type {
  ListAttendanceRecordsParams,
  ListAttendanceSessionsParams,
} from '../schemas/attendance.schema';

import { attendanceKeys } from './attendance-keys';

export function useAttendanceSessions(params?: ListAttendanceSessionsParams) {
  return useQuery({
    queryKey: attendanceKeys.sessionsList(params),
    queryFn: ({ signal }) => listAttendanceSessions(params, signal),
  });
}

export function useAttendanceSession(id: string) {
  return useQuery({
    queryKey: attendanceKeys.sessionDetail(id),
    queryFn: ({ signal }) => getAttendanceSession(id, signal),
    enabled: Boolean(id),
  });
}

export function useAttendanceRecords(params?: ListAttendanceRecordsParams) {
  return useQuery({
    queryKey: attendanceKeys.recordsList(params),
    queryFn: ({ signal }) => listAttendanceRecords(params, signal),
  });
}
