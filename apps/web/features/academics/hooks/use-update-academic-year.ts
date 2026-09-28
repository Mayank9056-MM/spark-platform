import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateAcademicYear } from '../api/academic-years';
import type { UpdateAcademicYearFormValues } from '../schemas/academic.schema';

import { academicKeys } from './academic-keys';

export function useUpdateAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAcademicYearFormValues }) =>
      updateAcademicYear(id, payload),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(academicKeys.academicYearDetail(id), updated);
      void queryClient.invalidateQueries({
        queryKey: academicKeys.academicYears(),
      });
    },
  });
}
