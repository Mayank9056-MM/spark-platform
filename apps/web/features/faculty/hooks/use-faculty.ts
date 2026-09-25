import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type ListFacultyLecturesParams,
  getFacultyAssignments,
  getFacultyAttendanceSummary,
  getFacultyLectureRoster,
  getFacultyLectures,
  getFacultyProfile,
  getFacultyTimetable,
  submitFacultyAttendance,
} from '../api/faculty.api';
import type { SubmitAttendanceInput } from '../schemas/faculty.schema';

import { facultyKeys } from './faculty-keys';

import { toast } from '@/components/ui/toast';

export function useFacultyProfile() {
  return useQuery({
    queryKey: facultyKeys.profile(),
    queryFn: ({ signal }) => getFacultyProfile(signal),
  });
}

export function useFacultyAssignments() {
  return useQuery({
    queryKey: facultyKeys.assignments(),
    queryFn: ({ signal }) => getFacultyAssignments(signal),
  });
}

export function useFacultyTimetable() {
  return useQuery({
    queryKey: facultyKeys.timetable(),
    queryFn: ({ signal }) => getFacultyTimetable(signal),
  });
}

export function useFacultyLectures(params?: ListFacultyLecturesParams) {
  return useQuery({
    queryKey: facultyKeys.lectures(params),
    queryFn: ({ signal }) => getFacultyLectures(params, signal),
  });
}

export function useFacultyLectureRoster(lectureId: string | null) {
  return useQuery({
    queryKey: facultyKeys.roster(lectureId ?? ''),
    queryFn: ({ signal }) => getFacultyLectureRoster(lectureId!, signal),
    enabled: Boolean(lectureId),
  });
}

export function useSubmitFacultyAttendance(lectureId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitAttendanceInput) => submitFacultyAttendance(lectureId, payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: facultyKeys.roster(lectureId),
      });
      void queryClient.invalidateQueries({
        queryKey: facultyKeys.lectures(),
      });
      void queryClient.invalidateQueries({
        queryKey: facultyKeys.attendanceSummary(),
      });
      void queryClient.invalidateQueries({
        queryKey: facultyKeys.profile(),
      });

      toast.add({
        title: data.session?.status === 'LOCKED' ? 'Attendance locked' : 'Attendance saved',
        description:
          data.session?.status === 'LOCKED'
            ? 'Attendance session has been finalized and locked.'
            : 'Attendance records have been successfully updated.',
        type: 'success',
      });
    },
    onError: (err: Error) => {
      toast.add({
        title: 'Attendance submission failed',
        description: err.message || 'Could not record attendance. Please try again.',
        type: 'error',
      });
    },
  });
}

export function useFacultyAttendanceSummary() {
  return useQuery({
    queryKey: facultyKeys.attendanceSummary(),
    queryFn: ({ signal }) => getFacultyAttendanceSummary(signal),
  });
}
