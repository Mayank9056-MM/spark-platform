import { type UserProfile, userProfileSchema } from '../schemas/user.schema';

import { apiRequest } from '@/lib/api/http-client';

export function getUser(id: string, signal?: AbortSignal): Promise<UserProfile> {
  return apiRequest(`/users/${encodeURIComponent(id)}`, userProfileSchema, { signal });
}
