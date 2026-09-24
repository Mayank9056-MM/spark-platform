import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createAcademicYear } from '../api/academic-years';
import type { CreateAcademicYearFormValues } from '../schemas/academic.schema';

import { academicKeys } from './academic-keys';

export function useCreateAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateAcademicYearFormValues) => createAcademicYear(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.academicYears(),
      });
    },
  });
}
