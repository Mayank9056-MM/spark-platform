import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelAdmission } from '../api/cancel-admission';

import { admissionKeys } from './admission-keys';

export function useCancelAdmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelAdmission(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(admissionKeys.detail(updated.id), updated);
      void queryClient.invalidateQueries({
        queryKey: admissionKeys.lists(),
      });
    },
  });
}
