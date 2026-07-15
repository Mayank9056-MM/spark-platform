import { createHash, randomBytes } from 'node:crypto';

/**
 * Shared by refresh tokens AND verification tokens — both need the same
 * "generate a random opaque value, store only its hash" pattern. One
 * implementation means one place to get the entropy/algorithm right.
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
