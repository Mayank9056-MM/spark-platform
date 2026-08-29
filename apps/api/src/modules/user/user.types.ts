import type { User, UserStatus } from '@spark/database';

export interface CreateUserInput {
  email: string;
  firstName: string;
  middleName?: string | undefined;
  lastName: string;
}

/**
 * Input for userRepository.createActivatedUser — the trusted bootstrap-only
 * primitive, distinct from CreateUserInput's ordinary self-service shape.
 * Requires passwordHash directly because this path skips the
 * PENDING_ACTIVATION + activation-token flow entirely.
 */
export interface CreateActivatedUserInput {
  email: string;
  firstName: string;
  middleName?: string | undefined;
  lastName: string;
  passwordHash: string;
}

export interface UpdateUserInput {
  firstName?: string | undefined;
  middleName?: string | null | undefined;
  lastName?: string | undefined;
  avatarUrl?: string | null | undefined;
}

export interface ListUsersFilters {
  search?: string | undefined;
  status?: UserStatus | undefined;
}

export interface ListUsersOptions {
  page: number;
  limit: number;
  sortBy: 'createdAt' | 'firstName' | 'lastName' | 'email';
  sortOrder: 'asc' | 'desc';
}

export interface ListUsersResult {
  users: User[];
  total: number;
}

/**
 * Named UserProfileDTO, not UserPublicDTO, deliberately distinct from
 * auth module's DTO of the same conceptual purpose — auth's shape is
 * minimal (login-context only); this one is the fuller profile shape.
 * Two different modules, two different DTOs, on purpose — never share
 * a DTO type across a module boundary, or a change meant for one
 * consumer silently reshapes the other's contract.
 */
export interface UserProfileDTO {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  status: UserStatus;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  // RBAC extension point — deliberately optional/omittable so adding real
  // role data later (once RBAC exists) is additive to this DTO, not a
  // breaking reshape. Do not populate this yet.
  roles?: string[];
}
