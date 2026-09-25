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
  student: '/app/dashboard',
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

/**
 * Where an authenticated-but-roleless user lands: no active
 * RoleAssignment rows, or only unrecognised role keys.
 *
 * This must never be a permission-gated route. A user with zero active
 * role assignments necessarily resolves to zero role-derived permissions
 * (see apps/api/.../auth/auth.service.ts#getCurrentUser — permissions
 * are resolved exclusively from getActiveAssignmentsForUser's roleIds),
 * so pointing this fallback at a RequirePermission-gated route creates
 * an unrecoverable loop:
 *
 *   no roles → fallback route → RequirePermission fails → /forbidden
 *   → "Return to dashboard" calls resolveDefaultRoute() again
 *   → same gated fallback → /forbidden → ...
 *
 * That is exactly what '/app/users' (gated on 'user:read') did.
 * '/app/dashboard' is safe: it has no layout.tsx guard beyond the
 * ProtectedBoundary every /app/* route already passes, and
 * PermissionFilteredDashboard already renders EmptyDashboardState for a
 * zero-permission user instead of blocking access. This grants no new
 * permissions — DASHBOARD_SECTIONS is still filtered by the user's real
 * (here, empty) permission set.
 */
const ROLELESS_FALLBACK_ROUTE: AppDestination = '/app/dashboard';

function isKnownRole(key: string): key is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(key);
}

/**
 * Resolves the default landing route for an authenticated user from their
 * role keys alone. Independent of React/router/UI — plain data in, plain
 * data out, so it's trivially unit-testable.
 *
 * - No roles → ROLELESS_FALLBACK_ROUTE (authenticated but unassigned; NOT
 *   unauthenticated).
 * - One or more known roles → the highest-priority role's destination.
 * - Only unknown/malformed role keys → ROLELESS_FALLBACK_ROUTE, same as
 *   no roles: an unrecognised role key is never assumed to carry any
 *   privilege.
 */
export function resolveDefaultRoute(roleKeys: readonly string[]): AppDestination {
  const known = roleKeys.filter(isKnownRole);

  if (known.length === 0) {
    return ROLELESS_FALLBACK_ROUTE;
  }

  for (const role of ROLE_PRIORITY) {
    if (known.includes(role)) {
      return ROLE_DESTINATION[role];
    }
  }

  // Unreachable — every RoleKey appears in ROLE_PRIORITY. Fails safe to
  // the same unguarded fallback as the no-roles case, rather than to a
  // permission-gated route, if that invariant is ever broken.
  return ROLELESS_FALLBACK_ROUTE;
}
