import { useQuery } from '@tanstack/react-query';

import { getFacultyAssignment } from '../api/faculty-assignments';

import { facultyAssignmentKeys } from './faculty-assignment-keys';

export function useFacultyAssignment(id: string) {
  return useQuery({
    queryKey: facultyAssignmentKeys.detail(id),
    queryFn: ({ signal }) => getFacultyAssignment(id, signal),
    enabled: Boolean(id),
  });
}
