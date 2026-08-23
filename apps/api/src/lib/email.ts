/**
 * The ONE place email normalization happens. Every write path
 * (registration/user creation), read path (login, existence checks,
 * uniqueness checks), and reset flow must call this — never inline
 * `.toLowerCase()`/`.trim()` at the call site (Phase 8). Two independent
 * inline implementations existed before this file (auth.repository.ts,
 * Zod schemas) — a second inline implementation is exactly the drift this
 * function exists to prevent.
 *
 * Deliberately minimal: trim + lowercase. Does not attempt Unicode
 * normalization (NFKC) or provider-specific canonicalization (e.g. Gmail's
 * dot-insensitivity/+tag stripping) — those change what "the same email"
 * means in ways that have real product implications and shouldn't be
 * decided inside a utility function.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
