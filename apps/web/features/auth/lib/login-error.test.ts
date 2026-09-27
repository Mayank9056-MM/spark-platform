import { describe, expect, it } from 'vitest';

import {
  formatRateLimitedMessage,
  getLoginErrorMessage,
  getStructuredLoginError,
  isInvalidCredentialsError,
} from './login-error';

import { API_ERROR_CODE, ApiClientError } from '@/lib/api/api-error';

describe('login-error', () => {
  describe('formatRateLimitedMessage', () => {
    it('formats seconds dynamically when retryAfter is present', () => {
      expect(formatRateLimitedMessage(17)).toBe(
        'Too many sign-in attempts. Please try again in 17 seconds.',
      );
      expect(formatRateLimitedMessage(1)).toBe(
        'Too many sign-in attempts. Please try again in 1 second.',
      );
    });

    it('falls back to generic message when retryAfter is not available or zero', () => {
      expect(formatRateLimitedMessage(undefined)).toBe(
        'Too many sign-in attempts. Wait a few minutes, then try again.',
      );
      expect(formatRateLimitedMessage(0)).toBe(
        'Too many sign-in attempts. Wait a few minutes, then try again.',
      );
    });
  });

  describe('getStructuredLoginError', () => {
    it('returns structured 429 error with dynamic countdown message', () => {
      const error = new ApiClientError({
        kind: 'http',
        status: 429,
        message: 'Rate limit exceeded',
        retryAfter: 35,
      });

      const structured = getStructuredLoginError(error);
      expect(structured.title).toBe('Sign-in attempts exceeded');
      expect(structured.description).toBe(
        'Too many sign-in attempts. Please try again in 35 seconds.',
      );
    });

    it('returns structured 401 invalid credentials error', () => {
      const error = new ApiClientError({
        kind: 'http',
        status: 401,
        code: API_ERROR_CODE.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      });

      expect(isInvalidCredentialsError(error)).toBe(true);
      const structured = getStructuredLoginError(error);
      expect(structured.title).toBe('Invalid credentials');
    });

    it('returns structured account locked error', () => {
      const error = new ApiClientError({
        kind: 'http',
        status: 403,
        code: API_ERROR_CODE.ACCOUNT_LOCKED,
        message: 'Account locked',
      });

      const structured = getStructuredLoginError(error);
      expect(structured.title).toBe('Account temporarily locked');
    });

    it('returns structured account pending activation error', () => {
      const error = new ApiClientError({
        kind: 'http',
        status: 403,
        code: API_ERROR_CODE.ACCOUNT_PENDING_ACTIVATION,
        message: 'Account pending activation',
      });

      const structured = getStructuredLoginError(error);
      expect(structured.title).toBe("Your account isn't activated yet.");
    });
  });

  describe('getLoginErrorMessage', () => {
    it('returns dynamic countdown copy for 429 rate limit', () => {
      const error = new ApiClientError({
        kind: 'http',
        status: 429,
        message: 'Rate limited',
        retryAfter: 12,
      });

      expect(getLoginErrorMessage(error)).toBe(
        'Too many sign-in attempts. Please try again in 12 seconds.',
      );
    });
  });
});
