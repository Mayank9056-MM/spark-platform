import type { ListTimetablesParams } from '../schemas/timetable.schema';

export const timetableKeys = {
  all: () => ['timetables'] as const,
  lists: () => [...timetableKeys.all(), 'list'] as const,
  list: (params?: ListTimetablesParams) => [...timetableKeys.lists(), params ?? {}] as const,
  details: () => [...timetableKeys.all(), 'detail'] as const,
  detail: (id: string) => [...timetableKeys.details(), id] as const,
};
