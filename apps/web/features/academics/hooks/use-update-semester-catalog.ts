import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateSemesterCatalog } from '../api/semester-catalogs';
import type { UpdateSemesterCatalogFormValues } from '../schemas/academic.schema';

import { academicKeys } from './academic-keys';

export function useUpdateSemesterCatalog(curriculumVersionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSemesterCatalogFormValues }) =>
      updateSemesterCatalog(id, payload),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(academicKeys.semesterDetail(id), updated);
      if (curriculumVersionId) {
        void queryClient.invalidateQueries({
          queryKey: academicKeys.curriculumStructure(curriculumVersionId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: academicKeys.semesters(),
      });
      void queryClient.invalidateQueries({
        queryKey: academicKeys.curricula(),
      });
    },
  });
}
