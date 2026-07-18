import type { User } from '@spark/database';

import type { UserProfileDTO } from './user.types.js';

export function toUserProfile(user: User): UserProfileDTO {
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    fullName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' '),
    status: user.status,
    avatarUrl: user.avatarUrl,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toUserProfileList(users: User[]): UserProfileDTO[] {
  return users.map(toUserProfile);
}
