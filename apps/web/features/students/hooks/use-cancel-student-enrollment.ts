import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelStudentEnrollment } from '../api/student-enrollments';
import type { CancelStudentEnrollmentInput } from '../schemas/student.schema';

import { studentKeys } from './student-keys';

export function useCancelStudentEnrollment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CancelStudentEnrollmentInput) => cancelStudentEnrollment(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: studentKeys.enrollments(),
      });
      void queryClient.invalidateQueries({
        queryKey: studentKeys.enrollmentDetail(id),
      });
    },
  });
}
