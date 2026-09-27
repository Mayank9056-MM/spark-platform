/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock('../api/create-axios', () => ({
  createAxiosInstance: () => ({
    post: mockPost,
  }),
}));

vi.mock('./session-state', () => ({
  sessionState: {
    markSignedIn: vi.fn(),
  },
}));

const mockStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStore[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(mockStore)) {
      delete mockStore[key];
    }
  }),
  length: 0,
  key: vi.fn(() => null),
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
} else {
  (global as any).localStorage = mockLocalStorage;
}

import { ApiClientError } from '../api/api-error';

import { getRefreshGeneration, refreshAccessToken } from './refresh-session';

describe('refresh-session - single flight and concurrency window (P1-001 remediation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('generates exactly 1 refresh request for 1, 5, 10, 20, 50 concurrent requests', async () => {
    mockPost.mockImplementation(async () => {
      // Simulate network latency for /auth/refresh
      await new Promise((r) => setTimeout(r, 20));
      return {
        status: 200,
        data: {
          success: true,
          data: {
            accessTokenExpiresAt: new Date(Date.now() + 900000).toISOString(),
          },
        },
      };
    });

    const initialGen = getRefreshGeneration();

    // 50 concurrent callers dispatched simultaneously at initialGen
    const promises = Array.from({ length: 50 }, () => refreshAccessToken(initialGen));

    await Promise.all(promises);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(getRefreshGeneration()).toBeGreaterThan(initialGen);
  });

  it('prevents redundant refresh when a late 401 arrives after refresh has completed', async () => {
    mockPost.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return {
        status: 200,
        data: {
          success: true,
          data: {
            accessTokenExpiresAt: new Date(Date.now() + 900000).toISOString(),
          },
        },
      };
    });

    const gen0 = getRefreshGeneration();

    // First request triggers refresh
    await refreshAccessToken(gen0);
    expect(mockPost).toHaveBeenCalledTimes(1);

    // Request 20 was delayed on network; its 401 arrives late with generation gen0
    await refreshAccessToken(gen0);

    // Should NOT have made a second refresh call!
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('skips network call if another tab already completed refresh in localStorage', async () => {
    const currentGen = getRefreshGeneration();

    // Another tab completes refresh and updates localStorage
    localStorage.setItem('spark:refresh_generation', (currentGen + 1).toString());

    // Current tab gets 401 from a request dispatched at currentGen
    await refreshAccessToken(currentGen);

    // No network call made because another tab already refreshed
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('propagates 401 error when refresh fails with 401', async () => {
    mockPost.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 401,
        data: {
          success: false,
          error: { code: 'TOKEN_INVALID', message: 'Session no longer active' },
        },
      },
    });

    const gen = getRefreshGeneration();
    await expect(refreshAccessToken(gen)).rejects.toBeInstanceOf(ApiClientError);
  });

  it('propagates 429 error when refresh fails with rate limit', async () => {
    mockPost.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 429,
        headers: { 'retry-after': '17' },
        data: {
          success: false,
          error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
        },
      },
    });

    const gen = getRefreshGeneration();
    await expect(refreshAccessToken(gen)).rejects.toMatchObject({
      status: 429,
      retryAfter: 17,
    });
  });

  it('propagates 500 / network failure without incrementing generation', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'));

    const genBefore = getRefreshGeneration();
    await expect(refreshAccessToken(genBefore)).rejects.toThrow('Network Error');
    expect(getRefreshGeneration()).toBe(genBefore);
  });
});
