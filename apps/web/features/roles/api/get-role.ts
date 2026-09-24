import { type RoleItem, roleItemSchema } from '../schemas/role.schema';

import { apiRequest } from '@/lib/api/http-client';

export function getRole(id: string, signal?: AbortSignal): Promise<RoleItem> {
  return apiRequest(`/rbac/roles/${id}`, roleItemSchema, { method: 'GET', signal });
}
