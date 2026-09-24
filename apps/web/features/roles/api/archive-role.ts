import { z } from 'zod';

import { apiRequest } from '@/lib/api/http-client';

const statusResponseSchema = z.object({
  success: z.boolean().optional(),
});

export function archiveRole(id: string, signal?: AbortSignal): Promise<{ success?: boolean }> {
  return apiRequest(`/rbac/roles/${id}/archive`, statusResponseSchema, {
    method: 'POST',
    signal,
  });
}
