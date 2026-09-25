import { useQuery } from '@tanstack/react-query';

import { getStudentEnrollment } from '../api/student-enrollments';

import { studentKeys } from './student-keys';

export function useStudentEnrollment(id: string) {
  return useQuery({
    queryKey: studentKeys.enrollmentDetail(id),
    queryFn: ({ signal }) => getStudentEnrollment(id, signal),
    enabled: Boolean(id),
  });
}
