import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteProgram } from '../api/programs';

import { academicKeys } from './academic-keys';

export function useDeleteProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProgram(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({
        queryKey: academicKeys.programDetail(id),
      });
      void queryClient.invalidateQueries({
        queryKey: academicKeys.programs(),
      });
    },
  });
}
