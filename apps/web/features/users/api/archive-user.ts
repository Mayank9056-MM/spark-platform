import { z } from 'zod';

import { apiRequest } from '@/lib/api/http-client';

export function archiveUser(id: string): Promise<unknown> {
  return apiRequest(`/users/${encodeURIComponent(id)}`, z.null().or(z.unknown()), {
    method: 'DELETE',
  });
}
