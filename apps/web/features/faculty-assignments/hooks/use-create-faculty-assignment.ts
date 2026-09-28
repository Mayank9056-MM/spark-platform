import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createFacultyAssignment } from '../api/faculty-assignments';
import type { CreateFacultyAssignmentInput } from '../schemas/faculty-assignment.schema';

import { facultyAssignmentKeys } from './faculty-assignment-keys';

export function useCreateFacultyAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFacultyAssignmentInput) => createFacultyAssignment(payload),
    onSuccess: (created) => {
      queryClient.setQueryData(facultyAssignmentKeys.detail(created.id), created);
      void queryClient.invalidateQueries({
        queryKey: facultyAssignmentKeys.all,
      });
    },
  });
}
