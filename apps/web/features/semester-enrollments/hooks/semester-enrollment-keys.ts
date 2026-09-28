export const semesterEnrollmentKeys = {
  all: ['semester-enrollments'] as const,
  lists: () => [...semesterEnrollmentKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) =>
    [...semesterEnrollmentKeys.lists(), params ?? {}] as const,
  details: () => [...semesterEnrollmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...semesterEnrollmentKeys.details(), id] as const,
  byStudentEnrollment: (studentEnrollmentId: string) =>
    [...semesterEnrollmentKeys.all, 'by-student-enrollment', studentEnrollmentId] as const,
};
