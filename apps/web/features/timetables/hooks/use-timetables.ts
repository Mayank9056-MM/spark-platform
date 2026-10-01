'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createTimetable, getTimetableById, listTimetables } from '../api/timetables.api';
import type { CreateTimetableInput, ListTimetablesParams } from '../schemas/timetable.schema';

import { timetableKeys } from './timetables-keys';

import { toast } from '@/components/ui/toast';

export function useTimetables(params?: ListTimetablesParams) {
  return useQuery({
    queryKey: timetableKeys.list(params),
    queryFn: ({ signal }) => listTimetables(params, signal),
  });
}

export function useTimetable(id: string) {
  return useQuery({
    queryKey: timetableKeys.detail(id),
    queryFn: ({ signal }) => getTimetableById(id, signal),
    enabled: Boolean(id),
  });
}

export function useCreateTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTimetableInput) => createTimetable(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });
      toast.add({
        title: 'Timetable Entry Created',
        description: 'New instructional class schedule slot has been successfully scheduled.',
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to schedule timetable entry.';
      toast.add({
        title: 'Timetable Scheduling Failed',
        description: message,
        type: 'error',
      });
    },
  });
}
