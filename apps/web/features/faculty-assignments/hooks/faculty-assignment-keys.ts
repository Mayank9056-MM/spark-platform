export const facultyAssignmentKeys = {
  all: ['faculty-assignments'] as const,
  lists: () => [...facultyAssignmentKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) =>
    [...facultyAssignmentKeys.lists(), params ?? {}] as const,
  details: () => [...facultyAssignmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...facultyAssignmentKeys.details(), id] as const,
};
