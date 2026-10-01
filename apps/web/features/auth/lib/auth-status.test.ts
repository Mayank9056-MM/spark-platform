import type { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { isUnauthenticatedError } from './auth-status';

import { API_ERROR_CODE, ApiClientError, apiErrorFromResponse } from '@/lib/api/api-error';

describe('isUnauthenticatedError', () => {
  it('returns true for ApiClientError with status 401', () => {
    const error = new ApiClientError({
      kind: 'http',
      status: 401,
      message: 'Unauthorized',
    });
    expect(isUnauthenticatedError(error)).toBe(true);

    const fromResponse = apiErrorFromResponse(401, {
      success: false,
      error: { message: 'Authentication required', code: 'UNAUTHENTICATED' },
    });
    expect(isUnauthenticatedError(fromResponse)).toBe(true);
  });

  it('returns false for ApiClientError with status 403, 404, 500, 0', () => {
    expect(
      isUnauthenticatedError(
        new ApiClientError({ kind: 'http', status: 403, message: 'Forbidden' }),
      ),
    ).toBe(false);
    expect(
      isUnauthenticatedError(
        new ApiClientError({ kind: 'http', status: 404, message: 'Not Found' }),
      ),
    ).toBe(false);
    expect(
      isUnauthenticatedError(
        new ApiClientError({ kind: 'http', status: 500, message: 'Server Error' }),
      ),
    ).toBe(false);
    expect(
      isUnauthenticatedError(
        new ApiClientError({ kind: 'network', status: 0, message: 'Network Error' }),
      ),
    ).toBe(false);
  });

  it('returns true for duck-typed ApiClientError when instanceof is lost across chunks', () => {
    const errorLike = {
      name: 'ApiClientError',
      status: 401,
      kind: 'http',
      message: 'Unauthorized',
    };
    expect(isUnauthenticatedError(errorLike)).toBe(true);
  });

  it('returns true for AxiosError with response status 401', () => {
    const axiosError = {
      name: 'AxiosError',
      isAxiosError: true,
      response: {
        status: 401,
        data: {
          success: false,
          error: { message: 'Authentication required', code: 'UNAUTHENTICATED' },
        },
      },
    } as unknown as AxiosError;
    expect(isUnauthenticatedError(axiosError)).toBe(true);
  });

  it('returns true for error with unauthenticated machine-readable codes', () => {
    expect(isUnauthenticatedError({ code: 'UNAUTHENTICATED' })).toBe(true);
    expect(isUnauthenticatedError({ code: API_ERROR_CODE.TOKEN_EXPIRED })).toBe(true);
    expect(isUnauthenticatedError({ code: API_ERROR_CODE.TOKEN_INVALID })).toBe(true);
    expect(
      isUnauthenticatedError({
        response: { data: { error: { code: 'UNAUTHENTICATED' } } },
      }),
    ).toBe(true);
  });

  it('returns true when cause is an unauthenticated error', () => {
    const wrappedError = new Error('Failed to bootstrap session', {
      cause: new ApiClientError({
        kind: 'http',
        status: 401,
        message: 'Session expired',
      }),
    });
    expect(isUnauthenticatedError(wrappedError)).toBe(true);
  });

  it('returns false for non-401 network and timeout errors', () => {
    expect(
      isUnauthenticatedError(
        new ApiClientError({
          kind: 'network',
          status: 0,
          message: 'Unable to reach the server',
        }),
      ),
    ).toBe(false);
    expect(
      isUnauthenticatedError(
        new ApiClientError({
          kind: 'timeout',
          status: 0,
          message: 'The request timed out',
        }),
      ),
    ).toBe(false);
  });

  it('returns false for null, undefined, and non-object values', () => {
    expect(isUnauthenticatedError(null)).toBe(false);
    expect(isUnauthenticatedError(undefined)).toBe(false);
    expect(isUnauthenticatedError('401')).toBe(false);
    expect(isUnauthenticatedError(401)).toBe(false);
    expect(isUnauthenticatedError({})).toBe(false);
  });
});
