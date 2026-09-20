import axios, { type AxiosResponse } from 'axios';
import { type z } from 'zod';

import { accessTokenStore } from '../auth/access-token-store';
import { refreshAccessToken } from '../auth/refresh-session';
import { expireSession } from '../auth/session-expiry';

import { API_ERROR_CODE, ApiClientError } from './api-error';
import { createAxiosInstance } from './create-axios';
import { parseSuccessEnvelope } from './envelope';
import { toApiClientError } from './normalize-error';

/**
 * The configured client is intentionally module-private. Every call goes
 * through `apiRequest`, which guarantees the response is validated against a
 * schema; exporting the raw instance would invite unvalidated calls.
 */
const client = createAxiosInstance();

client.interceptors.request.use((config) => {
  if (config.skipAuth !== true) {
    const token = accessTokenStore.get();
    if (token !== null) {
      // Also runs when a request is replayed after a refresh, which is how the
      // replay picks up the new token without any extra bookkeeping.
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return config;
});

client.interceptors.response.use(undefined, handleResponseError);

/**
 * Rejection handler for every response.
 *
 * - Cancellations pass through untouched (see toApiClientError).
 * - An expired access token (401 TOKEN_EXPIRED) triggers one shared refresh and
 *   a single replay of the original request. Only that exact code qualifies:
 *   a missing or malformed token, or wrong credentials, are not fixed by
 *   refreshing.
 * - If the refresh itself is rejected with 401 the session is over and the
 *   registered listener is told. Transient refresh failures (offline, 5xx)
 *   leave the session alone.
 * - Everything else becomes an ApiClientError.
 */
async function handleResponseError(error: unknown): Promise<AxiosResponse<unknown>> {
  if (axios.isCancel(error) || !axios.isAxiosError<unknown>(error)) {
    throw error;
  }

  const apiError = toApiClientError(error);
  const { config } = error;

  const shouldRefreshAndReplay =
    config !== undefined &&
    config.skipAuth !== true &&
    config.hasRetried !== true &&
    apiError.status === 401 &&
    apiError.code === API_ERROR_CODE.TOKEN_EXPIRED;

  if (!shouldRefreshAndReplay) {
    throw apiError;
  }

  try {
    await refreshAccessToken();
  } catch (refreshError) {
    if (refreshError instanceof ApiClientError && refreshError.status === 401) {
      expireSession();
    }
    throw refreshError;
  }

  return client.request<unknown>({ ...config, hasRetried: true });
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Caller-owned cancellation (e.g. TanStack Query's signal). */
  signal?: AbortSignal;
  /** Overrides the default request timeout. */
  timeoutMs?: number;
  /** Send the in-memory access token and allow refresh-and-replay. Defaults to true. */
  authenticated?: boolean;
}

/**
 * Performs a request against the SPARK API and returns the envelope's `data`,
 * validated against `schema`.
 *
 * Failures are always `ApiClientError`, except caller cancellation, which
 * rejects with axios' CanceledError so TanStack Query can recognise it.
 *
 * Retries are deliberately not done here. Queries retry through TanStack Query
 * (see makeQueryClient); mutations never retry, which matters for login
 * (attempts count toward lockout) and any non-idempotent write.
 */
export async function apiRequest<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  options: ApiRequestOptions = {},
): Promise<z.output<TSchema>> {
  const { method = 'GET', body, signal, timeoutMs, authenticated = true } = options;

  const response = await client.request<unknown>({
    url: path,
    method,
    skipAuth: !authenticated,
    ...(body !== undefined && { data: body }),
    ...(signal !== undefined && { signal }),
    ...(timeoutMs !== undefined && { timeout: timeoutMs }),
  });

  return parseSuccessEnvelope(response.data, schema, response.status);
}
