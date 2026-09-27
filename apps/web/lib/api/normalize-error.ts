import { AxiosError } from 'axios';

import { ApiClientError, apiErrorFromResponse } from './api-error';

/**
 * Extracts and parses the Retry-After (or RateLimit-Reset) header value into
 * whole seconds, handling both numeric delta seconds and HTTP-date strings.
 */
export function parseRetryAfter(headerValue: unknown): number | undefined {
  if (typeof headerValue === 'number' && Number.isFinite(headerValue) && headerValue >= 0) {
    return Math.round(headerValue);
  }

  if (typeof headerValue !== 'string') {
    return undefined;
  }

  const trimmed = headerValue.trim();
  if (!trimmed) {
    return undefined;
  }

  // Integer / numeric seconds
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds);
  }

  // HTTP Date representation
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    const diffSeconds = Math.ceil((dateMs - Date.now()) / 1000);
    return Math.max(0, diffSeconds);
  }

  return undefined;
}

/**
 * Normalises an AxiosError into the app's single error type.
 *
 * Cancellation is deliberately not handled here: callers must check
 * `axios.isCancel()` first and rethrow, because an aborted request is the
 * caller's own doing (e.g. TanStack Query cancelling a stale query), not a
 * failure to report.
 */
export function toApiClientError(error: AxiosError<unknown>): ApiClientError {
  if (error.response) {
    const headers = error.response.headers as Record<string, unknown> | undefined;
    const rawRetryAfter: unknown = headers?.['retry-after'] ?? headers?.['ratelimit-reset'];
    const retryAfter = parseRetryAfter(rawRetryAfter);
    return apiErrorFromResponse(error.response.status, error.response.data, error, retryAfter);
  }

  if (error.code === AxiosError.ETIMEDOUT || error.code === AxiosError.ECONNABORTED) {
    return new ApiClientError({
      kind: 'timeout',
      message: 'The request timed out',
      cause: error,
    });
  }

  return new ApiClientError({
    kind: 'network',
    message: 'Unable to reach the server',
    cause: error,
  });
}
