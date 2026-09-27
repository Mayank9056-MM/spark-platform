import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { ApiClientError } from './api-error';
import { parseRetryAfter, toApiClientError } from './normalize-error';

describe('normalize-error', () => {
  describe('parseRetryAfter', () => {
    it('parses valid numeric seconds', () => {
      expect(parseRetryAfter(30)).toBe(30);
      expect(parseRetryAfter(0)).toBe(0);
      expect(parseRetryAfter(17.4)).toBe(17);
    });

    it('parses integer strings', () => {
      expect(parseRetryAfter('45')).toBe(45);
      expect(parseRetryAfter(' 120 ')).toBe(120);
      expect(parseRetryAfter('0')).toBe(0);
    });

    it('parses HTTP date strings into positive remaining seconds', () => {
      const futureDate = new Date(Date.now() + 25_000).toUTCString();
      const parsed = parseRetryAfter(futureDate);
      expect(parsed).toBeDefined();
      expect(parsed).toBeGreaterThanOrEqual(23);
      expect(parsed).toBeLessThanOrEqual(26);
    });

    it('returns undefined for invalid or negative inputs', () => {
      expect(parseRetryAfter(undefined)).toBeUndefined();
      expect(parseRetryAfter(null)).toBeUndefined();
      expect(parseRetryAfter('')).toBeUndefined();
      expect(parseRetryAfter('   ')).toBeUndefined();
      expect(parseRetryAfter('not-a-number')).toBeUndefined();
      expect(parseRetryAfter(-10)).toBeUndefined();
    });
  });

  describe('toApiClientError', () => {
    it('normalizes 429 response with retry-after header', () => {
      const axiosError = {
        name: 'AxiosError',
        message: 'Request failed with status code 429',
        response: {
          status: 429,
          data: { success: false, message: 'Too many requests' },
          headers: {
            'retry-after': '28',
          },
        },
      } as unknown as AxiosError;

      const clientError = toApiClientError(axiosError);
      expect(clientError).toBeInstanceOf(ApiClientError);
      expect(clientError.status).toBe(429);
      expect(clientError.retryAfter).toBe(28);
      expect(clientError.message).toBe('Too many requests');
    });

    it('normalizes timeout errors', () => {
      const axiosError = {
        code: AxiosError.ETIMEDOUT,
        message: 'timeout of 5000ms exceeded',
      } as unknown as AxiosError;

      const clientError = toApiClientError(axiosError);
      expect(clientError.kind).toBe('timeout');
      expect(clientError.message).toBe('The request timed out');
    });

    it('normalizes network errors', () => {
      const axiosError = {
        message: 'Network Error',
      } as unknown as AxiosError;

      const clientError = toApiClientError(axiosError);
      expect(clientError.kind).toBe('network');
      expect(clientError.message).toBe('Unable to reach the server');
    });
  });
});
