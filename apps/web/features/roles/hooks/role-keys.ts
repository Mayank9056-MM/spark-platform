export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...roleKeys.lists(), params ?? {}] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
  permissions: (id: string) => [...roleKeys.detail(id), 'permissions'] as const,
  catalogPermissions: () => ['permissions', 'catalog'] as const,
  assignments: () => ['role-assignments'] as const,
  userAssignments: (userId: string) => [...roleKeys.assignments(), 'user', userId] as const,
};
