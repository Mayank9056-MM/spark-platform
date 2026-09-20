import axios from 'axios';
import { z } from 'zod';

import { createAxiosInstance } from '../api/create-axios';
import { parseSuccessEnvelope } from '../api/envelope';
import { toApiClientError } from '../api/normalize-error';

import { accessTokenStore } from './access-token-store';

const REFRESH_LOCK_NAME = 'spark:auth-refresh';

/** Mirrors the payload of POST /auth/refresh (auth.controller.ts). */
const refreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: z.iso.datetime(),
});

// A separate instance with no interceptors: a failing refresh must never be
// able to trigger another refresh.
const refreshClient = createAxiosInstance();

let inFlight: Promise<string> | null = null;

/**
 * Exchanges the httpOnly refresh cookie for a new access token and stores it.
 *
 * Why this is careful about concurrency: the API rotates refresh tokens and
 * treats a second use of an already-rotated token as theft, revoking the whole
 * session. Two overlapping refreshes with the same cookie would therefore sign
 * the user out. Two layers prevent that:
 *
 *   1. Single-flight within a tab — simultaneous 401s share one refresh call.
 *   2. Web Locks across tabs — refreshes from different tabs run one at a time,
 *      and each reads the cookie only after the previous one has rotated it.
 *      Where the API is unavailable the tab-level guard still applies.
 *
 * A failed refresh is never retried automatically. If the response was lost
 * after the server rotated the token, replaying the old cookie would look like
 * token reuse and revoke the session; surfacing the error is the safe outcome.
 *
 * Throws ApiClientError. A 401 means the session is over; any other failure
 * (network, timeout, 5xx) leaves the session intact so the user can retry.
 */
export function refreshAccessToken(): Promise<string> {
  inFlight ??= withCrossTabLock(performRefresh).finally(() => {
    inFlight = null;
  });

  return inFlight;
}

// Not generic on purpose: lib.dom types `locks.request` so that a callback
// returning Promise<T> yields Promise<Promise<T>>, which a generic wrapper
// cannot flatten without a cast. Awaiting the concrete result avoids that.
async function withCrossTabLock(task: () => Promise<string>): Promise<string> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return await navigator.locks.request(REFRESH_LOCK_NAME, task);
  }

  return task();
}

async function performRefresh(): Promise<string> {
  try {
    const response = await refreshClient.post<unknown>('/auth/refresh');
    const { accessToken } = parseSuccessEnvelope(
      response.data,
      refreshResponseSchema,
      response.status,
    );

    accessTokenStore.set(accessToken);
    return accessToken;
  } catch (error) {
    if (axios.isAxiosError<unknown>(error)) {
      throw toApiClientError(error);
    }
    throw error;
  }
}
