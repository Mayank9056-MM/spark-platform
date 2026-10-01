/* eslint-disable @typescript-eslint/no-unsafe-return */
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  usePathname: () => '/app',
}));

const mockRefreshCurrentUser = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/features/auth', () => ({
  LOGIN_PATH: '/login',
  useAuth: () => mockUseAuth(),
}));

vi.mock('./app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

import { ProtectedBoundary } from './protected-boundary';

describe('ProtectedBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state and redirects to /login when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isError: false,
      refreshCurrentUser: mockRefreshCurrentUser,
    });

    render(
      <ProtectedBoundary>
        <div data-testid="child-content">Protected Content</div>
      </ProtectedBoundary>,
    );

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('renders loading spinner while session bootstrap query is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      isError: false,
      refreshCurrentUser: mockRefreshCurrentUser,
    });

    render(
      <ProtectedBoundary>
        <div data-testid="child-content">Protected Content</div>
      </ProtectedBoundary>,
    );

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders children within AppShell when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isError: false,
      refreshCurrentUser: mockRefreshCurrentUser,
    });

    render(
      <ProtectedBoundary>
        <div data-testid="child-content">Protected Content</div>
      </ProtectedBoundary>,
    );

    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders actionable error UI with retry and sign in buttons when genuine error occurs', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isError: true,
      refreshCurrentUser: mockRefreshCurrentUser,
    });

    render(
      <ProtectedBoundary>
        <div data-testid="child-content">Protected Content</div>
      </ProtectedBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText("We couldn't confirm your session. Check your connection and try again."),
    ).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(mockRefreshCurrentUser).toHaveBeenCalledTimes(1);

    const signInLink = screen.getByRole('button', { name: 'Go to Sign In' });
    expect(signInLink).toHaveAttribute('href', '/login');

    // Should not automatically redirect when isError is true
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
