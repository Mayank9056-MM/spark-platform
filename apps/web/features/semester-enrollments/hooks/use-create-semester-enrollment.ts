import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createSemesterEnrollment } from '../api/semester-enrollments';
import type { CreateSemesterEnrollmentInput } from '../schemas/semester-enrollment.schema';

import { semesterEnrollmentKeys } from './semester-enrollment-keys';

export function useCreateSemesterEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSemesterEnrollmentInput) => createSemesterEnrollment(payload),
    onSuccess: (created) => {
      queryClient.setQueryData(semesterEnrollmentKeys.detail(created.id), created);
      void queryClient.invalidateQueries({
        queryKey: semesterEnrollmentKeys.all,
      });
    },
  });
}
