export const studentKeys = {
  all: ['students'] as const,
  enrollments: () => [...studentKeys.all, 'enrollments'] as const,
  enrollmentList: (params?: Record<string, unknown>) =>
    [...studentKeys.enrollments(), 'list', params ?? {}] as const,
  enrollmentDetail: (id: string) => [...studentKeys.enrollments(), 'detail', id] as const,
};
