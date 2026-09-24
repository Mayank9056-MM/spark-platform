import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { UserStatus } from '../schemas/user.schema';

import { UserStatusBadge } from './user-status-badge';

describe('UserStatusBadge', () => {
  it('renders ACTIVE badge correctly', () => {
    render(<UserStatusBadge status="ACTIVE" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders PENDING_ACTIVATION badge correctly', () => {
    render(<UserStatusBadge status="PENDING_ACTIVATION" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders ARCHIVED badge correctly', () => {
    render(<UserStatusBadge status="ARCHIVED" />);
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('renders SUSPENDED badge correctly', () => {
    render(<UserStatusBadge status="SUSPENDED" />);
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('renders LOCKED badge correctly', () => {
    render(<UserStatusBadge status="LOCKED" />);
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('renders DEACTIVATED badge correctly', () => {
    render(<UserStatusBadge status="DEACTIVATED" />);
    expect(screen.getByText('Deactivated')).toBeInTheDocument();
  });

  it('renders unknown/fallback status gracefully', () => {
    render(<UserStatusBadge status={'UNKNOWN_STATE' as unknown as UserStatus} />);
    expect(screen.getByText('UNKNOWN_STATE')).toBeInTheDocument();
  });
});
