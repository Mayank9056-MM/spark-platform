import { AxiosError } from 'axios';

import { ApiClientError, apiErrorFromResponse } from './api-error';

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
    return apiErrorFromResponse(error.response.status, error.response.data, error);
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
