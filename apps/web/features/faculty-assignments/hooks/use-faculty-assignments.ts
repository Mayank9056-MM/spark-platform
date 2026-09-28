import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { listFacultyAssignments } from '../api/faculty-assignments';
import type { ListFacultyAssignmentsParams } from '../schemas/faculty-assignment.schema';

import { facultyAssignmentKeys } from './faculty-assignment-keys';

export function useFacultyAssignments(params?: ListFacultyAssignmentsParams) {
  return useQuery({
    queryKey: facultyAssignmentKeys.list(params),
    queryFn: ({ signal }) => listFacultyAssignments(params, signal),
    placeholderData: keepPreviousData,
  });
}
