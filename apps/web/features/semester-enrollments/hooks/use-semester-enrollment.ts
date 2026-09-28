import { useQuery } from '@tanstack/react-query';

import { getSemesterEnrollment } from '../api/semester-enrollments';

import { semesterEnrollmentKeys } from './semester-enrollment-keys';

export function useSemesterEnrollment(id: string) {
  return useQuery({
    queryKey: semesterEnrollmentKeys.detail(id),
    queryFn: ({ signal }) => getSemesterEnrollment(id, signal),
    enabled: Boolean(id),
  });
}
