import { NextResponse } from 'next/server';

/**
 * Route classification lives at the file-system level (the (public) and
 * (protected) route groups) plus components/auth/protected-route.ts's
 * isProtectedPath() helper for any code that needs to test a path
 * programmatically. Proxy itself is NOT the authorization authority: it
 * never decodes cookies, never inspects JWT claims, never decides roles
 * or permissions, and never stands in for GET /auth/me or the backend's
 * authorize(). That verification happens exclusively in
 * ProtectedBoundary (components/layout/protected-boundary.tsx), which
 * is the sole owner of the authenticated/unauthenticated decision.
 *
 * A cookie-presence redirect optimization ("bounce obviously
 * signed-out visitors before they reach the protected layout") is
 * deliberately NOT implemented here: this app has no reliably-named,
 * non-HttpOnly signal Proxy could safely read, and guessing one would
 * risk exactly the mistake the spec warns against — treating cookie
 * presence as proof of authorization. If a safe signal is introduced
 * later it may be added here as a pure optimization; the protected
 * layout must keep verifying with /auth/me regardless.
 *
 * What this file legitimately does: baseline security headers on every
 * response — the actual "network boundary" work Proxy is for.
 */
export function proxy() {
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Every navigable route except static assets, image optimization,
     * and the favicon — Proxy runs on every request by default, and
     * there is nothing useful to add to those responses.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
