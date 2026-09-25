import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createStudentEnrollment } from '../api/student-enrollments';
import type { CreateStudentEnrollmentInput } from '../schemas/student.schema';

import { studentKeys } from './student-keys';

import { admissionKeys } from '@/features/admissions/hooks/admission-keys';

export function useCreateStudentEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStudentEnrollmentInput) => createStudentEnrollment(payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: studentKeys.enrollments(),
      });
      void queryClient.invalidateQueries({
        queryKey: admissionKeys.detail(variables.admissionId),
      });
      void queryClient.invalidateQueries({
        queryKey: admissionKeys.lists(),
      });
    },
  });
}
