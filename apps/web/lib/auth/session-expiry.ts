import { sessionState } from './session-state';

type SessionExpiredHandler = () => void;

let handler: SessionExpiredHandler | null = null;

/**
 * Registers the single listener that reacts when a signed-in session can no
 * longer be recovered (the refresh token was rejected). Returns an unsubscribe
 * function suitable for an effect cleanup.
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
 * Ends the session flag and notifies the listener once. Concurrent failures all
 * reach this function, but only the first finds the flag set; a visitor who was
 * never signed in never triggers a spurious "session expired" redirect.
 */
export function expireSession(): void {
  if (!sessionState.isSignedIn()) {
    return;
  }

  sessionState.clear();
  handler?.();
}
