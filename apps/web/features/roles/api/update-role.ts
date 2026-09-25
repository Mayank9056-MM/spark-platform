import { type RoleItem, roleItemSchema, type UpdateRoleFormValues } from '../schemas/role.schema';

import { apiRequest } from '@/lib/api/http-client';

export function updateRole(
  id: string,
  payload: UpdateRoleFormValues,
  signal?: AbortSignal,
): Promise<RoleItem> {
  return apiRequest(`/rbac/roles/${id}`, roleItemSchema, {
    method: 'PATCH',
    body: payload,
    signal,
  });
}
