import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type ListHodStudentsParams,
  type ListHodTimetableParams,
  createHodFacultyAssignment,
  createHodTimetableEntry,
  getHodAttendance,
  getHodCourseOfferings,
  getHodFaculty,
  getHodOverview,
  getHodProfile,
  getHodPromotions,
  getHodStudents,
  getHodTimetable,
  getHodTimetableOptions,
} from '../api/hod.api';
import type {
  CreateHodFacultyAssignmentInput,
  CreateHodTimetableEntryInput,
} from '../schemas/hod.schema';

import { hodKeys } from './hod-keys';

import { toast } from '@/components/ui/toast';

export function useHodProfile() {
  return useQuery({
    queryKey: hodKeys.profile(),
    queryFn: ({ signal }) => getHodProfile(signal),
  });
}

export function useHodOverview(enabled = true) {
  return useQuery({
    queryKey: hodKeys.overview(),
    queryFn: ({ signal }) => getHodOverview(signal),
    enabled,
  });
}

export function useHodFaculty(enabled = true) {
  return useQuery({
    queryKey: hodKeys.faculty(),
    queryFn: ({ signal }) => getHodFaculty(signal),
    enabled,
  });
}

export function useHodCourseOfferings(enabled = true) {
  return useQuery({
    queryKey: hodKeys.offerings(),
    queryFn: ({ signal }) => getHodCourseOfferings(signal),
    enabled,
  });
}

export function useHodStudents(params?: ListHodStudentsParams, enabled = true) {
  return useQuery({
    queryKey: hodKeys.students(params),
    queryFn: ({ signal }) => getHodStudents(params, signal),
    enabled,
  });
}

export function useHodTimetable(params?: ListHodTimetableParams, enabled = true) {
  return useQuery({
    queryKey: hodKeys.timetable(params),
    queryFn: ({ signal }) => getHodTimetable(params, signal),
    enabled,
  });
}

export function useHodTimetableOptions(enabled = true) {
  return useQuery({
    queryKey: hodKeys.timetableOptions(),
    queryFn: ({ signal }) => getHodTimetableOptions(signal),
    enabled,
  });
}

export function useHodAttendance(enabled = true) {
  return useQuery({
    queryKey: hodKeys.attendance(),
    queryFn: ({ signal }) => getHodAttendance(signal),
    enabled,
  });
}

export function useHodPromotions(enabled = true) {
  return useQuery({
    queryKey: hodKeys.promotions(),
    queryFn: ({ signal }) => getHodPromotions(signal),
    enabled,
  });
}

export function useCreateHodFacultyAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateHodFacultyAssignmentInput) => createHodFacultyAssignment(payload),
    onSuccess: () => {
      toast.add({
        title: 'Assignment created',
        description: 'Faculty member assigned to subject component successfully.',
        type: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: hodKeys.faculty() });
      void queryClient.invalidateQueries({ queryKey: hodKeys.overview() });
      void queryClient.invalidateQueries({ queryKey: hodKeys.offerings() });
    },
    onError: (error: Error) => {
      toast.add({
        title: 'Assignment failed',
        description: error.message || 'Failed to create faculty assignment.',
        type: 'error',
      });
    },
  });
}

export function useCreateHodTimetableEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateHodTimetableEntryInput) => createHodTimetableEntry(payload),
    onSuccess: () => {
      toast.add({
        title: 'Timetable scheduled',
        description: 'New timetable entry created successfully.',
        type: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: hodKeys.timetable() });
      void queryClient.invalidateQueries({ queryKey: hodKeys.overview() });
    },
    onError: (error: Error) => {
      toast.add({
        title: 'Scheduling failed',
        description: error.message || 'Failed to schedule timetable entry.',
        type: 'error',
      });
    },
  });
}
