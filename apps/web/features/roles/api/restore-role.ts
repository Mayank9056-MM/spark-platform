import { z } from 'zod';

import { apiRequest } from '@/lib/api/http-client';

const statusResponseSchema = z.object({
  success: z.boolean().optional(),
});

export function restoreRole(id: string, signal?: AbortSignal): Promise<{ success?: boolean }> {
  return apiRequest(`/rbac/roles/${id}/restore`, statusResponseSchema, {
    method: 'POST',
    signal,
  });
}
