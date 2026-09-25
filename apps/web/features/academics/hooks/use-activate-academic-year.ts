import { useMutation, useQueryClient } from '@tanstack/react-query';

import { activateAcademicYear } from '../api/academic-years';

import { academicKeys } from './academic-keys';

export function useActivateAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activateAcademicYear(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.academicYears(),
      });
    },
  });
}
