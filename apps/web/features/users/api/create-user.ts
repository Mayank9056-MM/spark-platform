import { z } from 'zod';

import {
  type CreateUserFormValues,
  type UserProfile,
  userProfileSchema,
} from '../schemas/user.schema';

import { apiRequest } from '@/lib/api/http-client';

const createUserResponseSchema = z.object({
  user: userProfileSchema,
});

export async function createUser(data: CreateUserFormValues): Promise<UserProfile> {
  const result = await apiRequest('/users', createUserResponseSchema, {
    method: 'POST',
    body: {
      email: data.email,
      firstName: data.firstName,
      middleName: data.middleName ?? undefined,
      lastName: data.lastName,
    },
  });

  return result.user;
}
