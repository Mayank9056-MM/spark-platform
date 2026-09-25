import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getStudentAcademics,
  getStudentAttendance,
  getStudentProfile,
  getStudentProgress,
  getStudentSubjects,
  getStudentTimetable,
  updateStudentProfile,
} from '../api/student.api';
import type { UpdateStudentProfileInput } from '../schemas/student.schema';

import { studentPortalKeys } from './student-keys';

import { toast } from '@/components/ui/toast';

export function useStudentProfile() {
  return useQuery({
    queryKey: studentPortalKeys.profile(),
    queryFn: ({ signal }) => getStudentProfile(signal),
  });
}

export function useUpdateStudentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateStudentProfileInput) => updateStudentProfile(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: studentPortalKeys.profile(),
      });
      toast.add({
        title: 'Profile updated',
        description: 'Your profile information has been successfully updated.',
        type: 'success',
      });
    },
    onError: (err: Error) => {
      toast.add({
        title: 'Update failed',
        description: err.message || 'Could not update profile information.',
        type: 'error',
      });
    },
  });
}

export function useStudentAcademics() {
  return useQuery({
    queryKey: studentPortalKeys.academics(),
    queryFn: ({ signal }) => getStudentAcademics(signal),
  });
}

export function useStudentSubjects() {
  return useQuery({
    queryKey: studentPortalKeys.subjects(),
    queryFn: ({ signal }) => getStudentSubjects(signal),
  });
}

export function useStudentAttendance() {
  return useQuery({
    queryKey: studentPortalKeys.attendance(),
    queryFn: ({ signal }) => getStudentAttendance(signal),
  });
}

export function useStudentTimetable() {
  return useQuery({
    queryKey: studentPortalKeys.timetable(),
    queryFn: ({ signal }) => getStudentTimetable(signal),
  });
}

export function useStudentProgress() {
  return useQuery({
    queryKey: studentPortalKeys.progress(),
    queryFn: ({ signal }) => getStudentProgress(signal),
  });
}
