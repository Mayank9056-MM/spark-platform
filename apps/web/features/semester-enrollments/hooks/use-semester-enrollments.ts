import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { listSemesterEnrollments } from '../api/semester-enrollments';
import type { ListSemesterEnrollmentsParams } from '../schemas/semester-enrollment.schema';

import { semesterEnrollmentKeys } from './semester-enrollment-keys';

export function useSemesterEnrollments(params?: ListSemesterEnrollmentsParams) {
  return useQuery({
    queryKey: semesterEnrollmentKeys.list(params),
    queryFn: ({ signal }) => listSemesterEnrollments(params, signal),
    placeholderData: keepPreviousData,
  });
}
