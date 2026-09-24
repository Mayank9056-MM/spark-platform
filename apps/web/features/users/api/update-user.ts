import {
  type UpdateUserFormValues,
  type UserProfile,
  userProfileSchema,
} from '../schemas/user.schema';

import { apiRequest } from '@/lib/api/http-client';

export function updateUser(id: string, data: UpdateUserFormValues): Promise<UserProfile> {
  return apiRequest(`/users/${encodeURIComponent(id)}`, userProfileSchema, {
    method: 'PATCH',
    body: {
      firstName: data.firstName,
      middleName: data.middleName ?? null,
      lastName: data.lastName,
      avatarUrl: data.avatarUrl ?? null,
    },
  });
}
