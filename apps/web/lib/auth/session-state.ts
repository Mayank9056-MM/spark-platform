/**
 * Whether this tab believes it has a session. The tokens are HttpOnly cookies
 * that JavaScript cannot read, so this is only a flag: set after a successful
 * login or refresh, cleared when the session is lost.
 *
 * Browser-only for writes: module state on the server is shared across every
 * request the process handles, so a flag set there would leak across users.
 */
let signedIn = false;

export const sessionState = {
  isSignedIn(): boolean {
    return signedIn;
  },

  markSignedIn(): void {
    if (typeof window === 'undefined') {
      throw new Error('sessionState.markSignedIn() must only be called in the browser.');
    }
    signedIn = true;
  },

  clear(): void {
    signedIn = false;
  },
};
