import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createProgram } from '../api/programs';
import type { CreateProgramFormValues } from '../schemas/academic.schema';

import { academicKeys } from './academic-keys';

export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateProgramFormValues) => createProgram(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.programs(),
      });
    },
  });
}
