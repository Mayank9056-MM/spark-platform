import { z } from 'zod';

const isoDateTime = z.iso.datetime();

/**
 * Mirrors the `UserStatus` enum in packages/database/prisma/schema.prisma. It is
 * restated here because the Prisma package must not be imported into the
 * browser bundle; once shared DTOs move into `packages/types`, import it instead.
 * Keep the two in sync — an unknown status fails login validation on purpose
 * rather than flowing into the UI as an unhandled value.
 */
export const USER_STATUSES = [
  'PENDING_ACTIVATION',
  'ACTIVE',
  'SUSPENDED',
  'LOCKED',
  'DEACTIVATED',
  'ARCHIVED',
] as const;

/** Mirrors `UserPublicDTO` (apps/api/src/modules/auth/auth.types.ts). */
export const userPublicSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  status: z.enum(USER_STATUSES),
  avatarUrl: z.string().nullable(),
  lockedUntil: isoDateTime.nullable(),
  lastLoginAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
});

/** Mirrors `LoginResponseDTO`. Neither token is in the body; both are httpOnly cookies. */
export const loginResponseSchema = z.object({
  user: userPublicSchema,
  accessTokenExpiresAt: isoDateTime,
});

export type UserPublic = z.infer<typeof userPublicSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
