/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-type-assertion */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../modules/auth/auth.repository.js', () => ({
  authRepository: {
    findActiveSessionWithUser: vi.fn(),
  },
}));

vi.mock('../modules/auth/auth.cookies.js', () => ({
  readAccessTokenCookie: vi.fn(),
}));

vi.mock('../lib/jwt.js', () => ({
  verifyAccessToken: vi.fn(),
}));

import { ErrorCode } from '../common/errors/ErrorCodes.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { readAccessTokenCookie } from '../modules/auth/auth.cookies.js';
import { authRepository } from '../modules/auth/auth.repository.js';

import { requireAuth } from './auth.middleware.js';

describe('requireAuth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createReq = (overrides = {}) =>
    ({
      path: '/api/v1/auth/me',
      originalUrl: '/api/v1/auth/me',
      ...overrides,
    }) as any;

  const mockActiveUser = {
    id: 'user-active-1',
    status: 'ACTIVE',
    deletedAt: null,
    lockedUntil: null,
  };

  const mockSession = {
    id: 'session-1',
    userId: 'user-active-1',
    user: mockActiveUser,
  };

  it('rejects unauthenticated request when no token cookie present', async () => {
    vi.mocked(readAccessTokenCookie).mockReturnValue(undefined);
    const next = vi.fn();
    const req = createReq();

    await requireAuth(req, {} as any, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: ErrorCode.UNAUTHENTICATED,
      }),
    );
  });

  it('passes active user with valid token and active session', async () => {
    vi.mocked(readAccessTokenCookie).mockReturnValue('valid-token');
    vi.mocked(verifyAccessToken).mockReturnValue({
      sub: 'user-active-1',
      sid: 'session-1',
    } as any);
    vi.mocked(authRepository.findActiveSessionWithUser).mockResolvedValue(mockSession as any);
    const next = vi.fn();
    const req = createReq();

    await requireAuth(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'user-active-1', sessionId: 'session-1' });
  });

  it('rejects suspended user with 403 ACCOUNT_LOCKED (P0-002 remediation)', async () => {
    vi.mocked(readAccessTokenCookie).mockReturnValue('valid-token');
    vi.mocked(verifyAccessToken).mockReturnValue({
      sub: 'user-suspended-1',
      sid: 'session-2',
    } as any);
    vi.mocked(authRepository.findActiveSessionWithUser).mockResolvedValue({
      id: 'session-2',
      userId: 'user-suspended-1',
      user: {
        id: 'user-suspended-1',
        status: 'SUSPENDED',
        deletedAt: null,
      },
    } as any);
    const next = vi.fn();
    const req = createReq();

    await requireAuth(req, {} as any, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: ErrorCode.ACCOUNT_LOCKED,
      }),
    );
  });

  it('rejects deactivated/archived user with 401 UNAUTHENTICATED', async () => {
    vi.mocked(readAccessTokenCookie).mockReturnValue('valid-token');
    vi.mocked(verifyAccessToken).mockReturnValue({
      sub: 'user-deactivated-1',
      sid: 'session-3',
    } as any);
    vi.mocked(authRepository.findActiveSessionWithUser).mockResolvedValue({
      id: 'session-3',
      userId: 'user-deactivated-1',
      user: {
        id: 'user-deactivated-1',
        status: 'DEACTIVATED',
        deletedAt: null,
      },
    } as any);
    const next = vi.fn();
    const req = createReq();

    await requireAuth(req, {} as any, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: ErrorCode.UNAUTHENTICATED,
      }),
    );
  });

  it('rejects soft-deleted user with 401 UNAUTHENTICATED', async () => {
    vi.mocked(readAccessTokenCookie).mockReturnValue('valid-token');
    vi.mocked(verifyAccessToken).mockReturnValue({
      sub: 'user-deleted-1',
      sid: 'session-4',
    } as any);
    vi.mocked(authRepository.findActiveSessionWithUser).mockResolvedValue({
      id: 'session-4',
      userId: 'user-deleted-1',
      user: {
        id: 'user-deleted-1',
        status: 'ACTIVE',
        deletedAt: new Date(),
      },
    } as any);
    const next = vi.fn();
    const req = createReq();

    await requireAuth(req, {} as any, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: ErrorCode.UNAUTHENTICATED,
      }),
    );
  });

  it('rejects when session has been revoked or expired', async () => {
    vi.mocked(readAccessTokenCookie).mockReturnValue('valid-token');
    vi.mocked(verifyAccessToken).mockReturnValue({
      sub: 'user-1',
      sid: 'revoked-session',
    } as any);
    vi.mocked(authRepository.findActiveSessionWithUser).mockResolvedValue(null);
    const next = vi.fn();
    const req = createReq();

    await requireAuth(req, {} as any, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: ErrorCode.TOKEN_INVALID,
      }),
    );
  });

  it('allows suspended user to access logout route to clear cookies without 403', async () => {
    vi.mocked(readAccessTokenCookie).mockReturnValue('valid-token');
    vi.mocked(verifyAccessToken).mockReturnValue({
      sub: 'user-suspended-1',
      sid: 'session-logout',
    } as any);
    vi.mocked(authRepository.findActiveSessionWithUser).mockResolvedValue({
      id: 'session-logout',
      userId: 'user-suspended-1',
      user: {
        id: 'user-suspended-1',
        status: 'SUSPENDED',
        deletedAt: null,
      },
    } as any);
    const next = vi.fn();
    const req = createReq({
      path: '/logout',
      originalUrl: '/api/v1/auth/logout',
    });

    await requireAuth(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'user-suspended-1', sessionId: 'session-logout' });
  });
});
