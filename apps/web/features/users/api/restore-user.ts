import { type UserProfile, userProfileSchema } from '../schemas/user.schema';

import { apiRequest } from '@/lib/api/http-client';

export function restoreUser(id: string): Promise<UserProfile> {
  return apiRequest(`/users/${encodeURIComponent(id)}/restore`, userProfileSchema, {
    method: 'POST',
  });
}
