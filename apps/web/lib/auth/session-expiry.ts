import { accessTokenStore } from './access-token-store';

type SessionExpiredHandler = () => void;

let handler: SessionExpiredHandler | null = null;

/**
 * Registers the single listener that reacts when a signed-in session can no
 * longer be recovered (the refresh token was rejected). The session provider
 * uses it to clear cached data and send the user to the login page. Returns an
 * unsubscribe function suitable for an effect cleanup.
 */
export function setSessionExpiredHandler(next: SessionExpiredHandler): () => void {
  handler = next;

  return () => {
    if (handler === next) {
      handler = null;
    }
  };
}

/**
 * Ends the in-memory session and notifies the listener — once.
 *
 * When several requests fail at the same moment they all reach this function,
 * but only the first still finds a token to clear; the rest are no-ops. That
 * also means a visitor who was never signed in (no token in memory) never
 * triggers a spurious "session expired" redirect.
 */
export function expireSession(): void {
  if (accessTokenStore.get() === null) {
    return;
  }

  accessTokenStore.clear();
  handler?.();
}
