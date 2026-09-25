export const admissionKeys = {
  all: ['admissions'] as const,
  lists: () => [...admissionKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...admissionKeys.lists(), params ?? {}] as const,
  details: () => [...admissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...admissionKeys.details(), id] as const,
};
