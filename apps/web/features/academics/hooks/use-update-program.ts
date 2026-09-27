import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateProgram } from '../api/programs';
import type { UpdateProgramFormValues } from '../schemas/academic.schema';

import { academicKeys } from './academic-keys';

export function useUpdateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProgramFormValues }) =>
      updateProgram(id, payload),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(academicKeys.programDetail(id), updated);
      void queryClient.invalidateQueries({
        queryKey: academicKeys.programs(),
      });
    },
  });
}
