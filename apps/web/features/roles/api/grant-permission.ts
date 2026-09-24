import { z } from 'zod';

import { apiRequest } from '@/lib/api/http-client';

const statusResponseSchema = z.object({
  success: z.boolean().optional(),
});

export function grantPermission(
  roleId: string,
  permissionId: string,
  signal?: AbortSignal,
): Promise<{ success?: boolean }> {
  return apiRequest(`/rbac/roles/${roleId}/permissions/${permissionId}`, statusResponseSchema, {
    method: 'POST',
    signal,
  });
}
