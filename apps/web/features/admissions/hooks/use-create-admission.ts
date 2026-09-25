import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createAdmission } from '../api/create-admission';
import type { CreateAdmissionFormValues } from '../schemas/admission.schema';

import { admissionKeys } from './admission-keys';

export function useCreateAdmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateAdmissionFormValues) => createAdmission(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: admissionKeys.lists(),
      });
    },
  });
}
