import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateAdmission } from '../api/update-admission';
import type { UpdateAdmissionFormValues } from '../schemas/admission.schema';

import { admissionKeys } from './admission-keys';

export function useUpdateAdmission(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: UpdateAdmissionFormValues) => updateAdmission(id, values),
    onSuccess: (updated) => {
      queryClient.setQueryData(admissionKeys.detail(id), updated);
      void queryClient.invalidateQueries({
        queryKey: admissionKeys.lists(),
      });
    },
  });
}
