import type { RoleKey, RoleSummary } from '@/features/auth';

/**
 * Centralised role/permission checks so no page has to write
 * `permissions.includes('student:read')` inline. This is UX filtering
 * only — deciding what to show. The backend's authorize() remains the
 * actual security boundary.
 */

export function hasRole(roles: readonly RoleSummary[], key: RoleKey): boolean {
  return roles.some((role) => role.key === key);
}

export function hasAnyRole(roles: readonly RoleSummary[], keys: readonly RoleKey[]): boolean {
  return keys.some((key) => hasRole(roles, key));
}

export function hasPermission(permissions: readonly string[], key: string): boolean {
  return permissions.includes(key);
}

export function hasAnyPermission(permissions: readonly string[], keys: readonly string[]): boolean {
  return keys.some((key) => hasPermission(permissions, key));
}
