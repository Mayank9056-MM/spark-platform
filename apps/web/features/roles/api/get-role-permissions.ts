import { type RoleWithPermissions, roleWithPermissionsSchema } from '../schemas/role.schema';

import { apiRequest } from '@/lib/api/http-client';

export function getRoleWithPermissions(
  roleId: string,
  signal?: AbortSignal,
): Promise<RoleWithPermissions> {
  return apiRequest(`/rbac/roles/${roleId}/permissions`, roleWithPermissionsSchema, {
    method: 'GET',
    signal,
  });
}
