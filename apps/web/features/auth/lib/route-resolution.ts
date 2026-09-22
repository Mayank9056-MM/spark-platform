// apps/web/features/auth/lib/route-resolution.ts

/**
 * Canonical role keys, mirroring apps/api/src/modules/rbac/roles/role.bootstrap.ts's
 * SYSTEM_ROLES. Lowercase snake_case — not invented uppercase keys. Keep
 * this list in sync by hand; the server is the authority.
 */
export const ROLE_KEYS = [
  'super_admin',
  'admin',
  'principal',
  'hod',
  'faculty',
  'officer',
  'clerk',
  'student',
  'secretary',
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export type AppDestination =
  '/app/super-admin' | '/app/admin' | '/app/dashboard' | '/app/student' | '/app/users';

/**
 * principal/hod/officer/clerk/secretary intentionally land on the shared
 * /app/dashboard for now — no dedicated landing route exists yet. Moving
 * any of them to a dedicated route later only means changing its entry
 * here; the resolver's precedence logic below doesn't change.
 */
const ROLE_DESTINATION: Readonly<Record<RoleKey, AppDestination>> = {
  super_admin: '/app/super-admin',
  admin: '/app/admin',
  principal: '/app/dashboard',
  hod: '/app/dashboard',
  faculty: '/app/dashboard',
  officer: '/app/dashboard',
  clerk: '/app/dashboard',
  secretary: '/app/dashboard',
  student: '/app/student',
};

/**
 * Deterministic, explicit priority — highest privilege first. Never
 * derived from permission count, user id, or any other proxy.
 */
const ROLE_PRIORITY: readonly RoleKey[] = [
  'super_admin',
  'admin',
  'principal',
  'hod',
  'officer',
  'secretary',
  'clerk',
  'faculty',
  'student',
];

function isKnownRole(key: string): key is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(key);
}

/**
 * Resolves the default landing route for an authenticated user from their
 * role keys alone. Independent of React/router/UI — plain data in, plain
 * data out, so it's trivially unit-testable (even though no tests are
 * being added right now).
 *
 * - No roles → /app/users (authenticated but unassigned; NOT unauthenticated).
 * - One or more known roles → the highest-priority role's destination.
 * - Only unknown/malformed role keys → /app/users, same as no roles: an
 *   unrecognised role key is never assumed to carry any privilege.
 */
export function resolveDefaultRoute(roleKeys: readonly string[]): AppDestination {
  const known = roleKeys.filter(isKnownRole);

  if (known.length === 0) {
    return '/app/users';
  }

  for (const role of ROLE_PRIORITY) {
    if (known.includes(role)) {
      return ROLE_DESTINATION[role];
    }
  }

  // Unreachable — every RoleKey appears in ROLE_PRIORITY. Fails safe
  // rather than silently, if that invariant is ever broken.
  return '/app/users';
}
