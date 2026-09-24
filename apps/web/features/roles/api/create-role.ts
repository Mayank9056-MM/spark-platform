import { type CreateRoleFormValues, type RoleItem, roleItemSchema } from '../schemas/role.schema';

import { apiRequest } from '@/lib/api/http-client';

export function createRole(payload: CreateRoleFormValues, signal?: AbortSignal): Promise<RoleItem> {
  return apiRequest('/rbac/roles', roleItemSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}
