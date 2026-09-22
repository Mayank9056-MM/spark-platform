/**
 * Pure path classification — no React, no auth decision. Kept
 * framework-agnostic so it can be imported from proxy.ts (Node.js
 * runtime, outside the React tree) as well as from ordinary components.
 *
 * This does NOT decide whether a request is authenticated — only
 * whether a path falls under the protected `/app` prefix. The actual
 * authentication check is GET /auth/me, performed client-side in
 * ProtectedBoundary (components/layout/protected-boundary.tsx).
 */
export const PROTECTED_PATH_PREFIX = '/app';

export function isProtectedPath(pathname: string): boolean {
  return pathname === PROTECTED_PATH_PREFIX || pathname.startsWith(`${PROTECTED_PATH_PREFIX}/`);
}
