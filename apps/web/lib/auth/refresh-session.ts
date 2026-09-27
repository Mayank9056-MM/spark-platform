import axios from 'axios';
import { z } from 'zod';

import { createAxiosInstance } from '../api/create-axios';
import { parseSuccessEnvelope } from '../api/envelope';
import { toApiClientError } from '../api/normalize-error';

import { sessionState } from './session-state';

const REFRESH_LOCK_NAME = 'spark:auth-refresh';
const REFRESH_GEN_STORAGE_KEY = 'spark:refresh_generation';

/** Mirrors POST /auth/refresh (auth.controller.ts). The tokens are cookies, not body fields. */
const refreshResponseSchema = z.object({
  accessTokenExpiresAt: z.iso.datetime(),
});

// A separate instance with no interceptors: a failing refresh must never be
// able to trigger another refresh.
const refreshClient = createAxiosInstance();

let inFlight: Promise<void> | null = null;
let inMemoryGeneration = 0;

export function getRefreshGeneration(): number {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(REFRESH_GEN_STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!Number.isNaN(parsed) && parsed > inMemoryGeneration) {
          inMemoryGeneration = parsed;
        }
      }
    } catch {
      // Ignore localStorage access failures (e.g. sandboxed iframe)
    }
  }
  return inMemoryGeneration;
}

export function advanceRefreshGeneration(): number {
  inMemoryGeneration = Math.max(inMemoryGeneration, getRefreshGeneration()) + 1;
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      window.localStorage.setItem(REFRESH_GEN_STORAGE_KEY, inMemoryGeneration.toString());
    } catch {
      // Ignore localStorage access failures
    }
  }
  sessionState.markSignedIn();
  return inMemoryGeneration;
}

/**
 * Asks the API to rotate the session cookies (a new access cookie and a new
 * refresh cookie arrive as Set-Cookie).
 *
 * Why this is careful about concurrency: the API rotates refresh tokens and
 * treats a second use of an already-rotated token as theft, revoking the whole
 * session. Two overlapping refreshes with the same cookie would therefore sign
 * the user out. Three layers prevent that:
 *
 *   1. Single-flight within a tab: simultaneous 401s share one refresh call.
 *   2. Web Locks across tabs: refreshes from different tabs run one at a time,
 *      and the browser attaches the cookie only when each request is sent, after
 *      the previous one has rotated it.
 *   3. Generation tracking: requests dispatched before a refresh succeeded
 *      skip redundant refreshes when late 401 responses arrive, since the
 *      cookie jar already has the newly rotated access token.
 *
 * A failed refresh is never retried automatically. If the response was lost
 * after the server rotated the token, replaying the old cookie would look like
 * token reuse and revoke the session; surfacing the error is the safe outcome.
 *
 * Throws ApiClientError. A 401 means the session is over; any other failure
 * (network, timeout, 5xx) leaves the session intact so the user can retry.
 */
export function refreshAccessToken(requestGeneration?: number): Promise<void> {
  // If a refresh already succeeded after this request was sent, the browser's
  // cookie jar already holds the updated token pair. Do not trigger a redundant refresh.
  if (requestGeneration !== undefined && getRefreshGeneration() > requestGeneration) {
    return Promise.resolve();
  }

  inFlight ??= withCrossTabLock(async () => {
    // Re-check after acquiring cross-tab lock in case another tab or concurrent caller completed refresh
    if (requestGeneration !== undefined && getRefreshGeneration() > requestGeneration) {
      return;
    }
    await performRefresh();
  }).finally(() => {
    inFlight = null;
  });

  return inFlight;
}

// Not generic on purpose: lib.dom types `locks.request` so that a callback
// returning Promise<T> yields Promise<Promise<T>>, which a generic wrapper
// cannot flatten without a cast.
async function withCrossTabLock(task: () => Promise<void>): Promise<void> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    await navigator.locks.request(REFRESH_LOCK_NAME, task);
    return;
  }

  await task();
}

async function performRefresh(): Promise<void> {
  try {
    const response = await refreshClient.post<unknown>('/auth/refresh');
    // Validates the envelope; the new tokens are already in the cookie jar.
    parseSuccessEnvelope(response.data, refreshResponseSchema, response.status);
    advanceRefreshGeneration();
  } catch (error) {
    if (axios.isAxiosError<unknown>(error)) {
      throw toApiClientError(error);
    }
    throw error;
  }
}
