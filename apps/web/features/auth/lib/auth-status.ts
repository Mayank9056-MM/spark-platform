import { ApiClientError } from '@/lib/api/api-error';

/**
 * The only distinction the auth bootstrap cares about: HTTP 200 is
 * authenticated, HTTP 401 is unauthenticated, and every other outcome
 * (500, network failure, timeout, a malformed body) is a genuine error
 * state that must not be silently treated as "not signed in".
 */
export function isUnauthenticatedError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 401;
}
