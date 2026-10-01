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

let isExpiring = false;

/**
 * Ends the session flag and notifies the listener once. Concurrent failures all
 * reach this function, but debouncing ensures the handler is invoked once.
 */
export function expireSession(): void {
  sessionState.clear();

  if (isExpiring) {
    return;
  }
  isExpiring = true;
  try {
    handler?.();
  } finally {
    setTimeout(() => {
      isExpiring = false;
    }, 1000);
  }
}
