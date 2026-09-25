import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { listStudentEnrollments } from '../api/student-enrollments';
import type { ListStudentEnrollmentsParams } from '../schemas/student.schema';

import { studentKeys } from './student-keys';

export function useStudentEnrollments(params?: ListStudentEnrollmentsParams) {
  return useQuery({
    queryKey: studentKeys.enrollmentList(params as Record<string, unknown> | undefined),
    queryFn: ({ signal }) => listStudentEnrollments(params, signal),
    placeholderData: keepPreviousData,
  });
}
