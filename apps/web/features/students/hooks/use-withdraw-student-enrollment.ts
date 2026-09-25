import { useMutation, useQueryClient } from '@tanstack/react-query';

import { withdrawStudentEnrollment } from '../api/student-enrollments';
import type { WithdrawStudentEnrollmentInput } from '../schemas/student.schema';

import { studentKeys } from './student-keys';

export function useWithdrawStudentEnrollment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WithdrawStudentEnrollmentInput) => withdrawStudentEnrollment(id, payload),
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
