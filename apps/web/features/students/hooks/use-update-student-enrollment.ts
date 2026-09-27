import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateStudentEnrollment } from '../api/student-enrollments';
import type { UpdateStudentEnrollmentInput } from '../schemas/student.schema';

import { studentKeys } from './student-keys';

export function useUpdateStudentEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStudentEnrollmentInput }) =>
      updateStudentEnrollment(id, payload),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(studentKeys.enrollmentDetail(id), updated);
      void queryClient.invalidateQueries({
        queryKey: studentKeys.enrollments(),
      });
    },
  });
}
