/* eslint-disable @typescript-eslint/no-unsafe-return */
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

const mockRefetch = vi.fn();
const mockUseCurrentUser = vi.fn();

vi.mock('../hooks/use-current-user', () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock('../lib/auth-status', () => ({
  isUnauthenticatedError: (err: unknown) => {
    const e = err as { status?: number; name?: string } | null | undefined;
    return e?.status === 401 || e?.name === 'Unauthenticated';
  },
}));

vi.mock('../lib/route-resolution', () => ({
  resolveDefaultRoute: () => '/app/dashboard',
}));

import { AuthResolutionBoundary } from './auth-resolution-boundary';

describe('AuthResolutionBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pending state when query is in flight', () => {
    mockUseCurrentUser.mockReturnValue({
      isSuccess: false,
      isError: false,
      refetch: mockRefetch,
    });

    render(
      <AuthResolutionBoundary>
        <div data-testid="login-form">Login Form</div>
      </AuthResolutionBoundary>,
    );

    expect(screen.getByText('Checking your session…')).toBeInTheDocument();
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
  });

  it('renders children immediately when user is confirmed unauthenticated (401)', () => {
    mockUseCurrentUser.mockReturnValue({
      isSuccess: false,
      isError: true,
      error: { status: 401 },
      refetch: mockRefetch,
    });

    render(
      <AuthResolutionBoundary>
        <div data-testid="login-form">Login Form</div>
      </AuthResolutionBoundary>,
    );

    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.queryByText('Checking your session…')).not.toBeInTheDocument();
  });

  it('redirects to default route when user is authenticated', () => {
    mockUseCurrentUser.mockReturnValue({
      isSuccess: true,
      isError: false,
      data: { roles: [{ key: 'admin' }] },
      refetch: mockRefetch,
    });

    render(
      <AuthResolutionBoundary>
        <div data-testid="login-form">Login Form</div>
      </AuthResolutionBoundary>,
    );

    expect(mockReplace).toHaveBeenCalledWith('/app/dashboard');
  });

  it('renders error shell with retry and continue buttons when genuine error occurs', () => {
    mockUseCurrentUser.mockReturnValue({
      isSuccess: false,
      isError: true,
      error: { status: 500, message: 'Server error' },
      refetch: mockRefetch,
    });

    render(
      <AuthResolutionBoundary>
        <div data-testid="login-form">Login Form</div>
      </AuthResolutionBoundary>,
    );

    expect(screen.getByText("Couldn't confirm your session")).toBeInTheDocument();
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    const continueBtn = screen.getByRole('button', { name: 'Continue to Sign In' });
    fireEvent.click(continueBtn);

    // Form should now be rendered after user clicks continue
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });
});
