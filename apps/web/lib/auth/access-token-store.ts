/**
 * In-memory holder for the short-lived access token (15 minutes server-side).
 *
 * Deliberately NOT localStorage / sessionStorage / a JS-readable cookie: any
 * XSS could read those. The long-lived refresh token never reaches JavaScript —
 * the API keeps it in an httpOnly cookie — so a full page reload recovers the
 * session through POST /auth/refresh rather than through persisted tokens.
 *
 * Browser-only for writes. Module state on the server is shared across every
 * request handled by the same process, so storing a user's token there would
 * leak it to other users. `get()` is safe anywhere: on the server it is always
 * null because `set()` refuses to run there.
 */
let accessToken: string | null = null;

export const accessTokenStore = {
  get(): string | null {
    return accessToken;
  },

  set(token: string): void {
    if (typeof window === 'undefined') {
      throw new Error('accessTokenStore.set() must only be called in the browser.');
    }
    accessToken = token;
  },

  clear(): void {
    accessToken = null;
  },
};
