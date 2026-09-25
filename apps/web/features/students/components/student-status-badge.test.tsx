import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { StudentLifecycleStatus } from '../schemas/student.schema';

import { StudentStatusBadge } from './student-status-badge';

describe('StudentStatusBadge', () => {
  it('renders ACTIVE badge correctly', () => {
    render(<StudentStatusBadge status="ACTIVE" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders ON_GAP_YEAR badge correctly', () => {
    render(<StudentStatusBadge status="ON_GAP_YEAR" />);
    expect(screen.getByText('Gap Year')).toBeInTheDocument();
  });

  it('renders GRADUATED badge correctly', () => {
    render(<StudentStatusBadge status="GRADUATED" />);
    expect(screen.getByText('Graduated')).toBeInTheDocument();
  });

  it('renders ALUMNI badge correctly', () => {
    render(<StudentStatusBadge status="ALUMNI" />);
    expect(screen.getByText('Alumni')).toBeInTheDocument();
  });

  it('renders WITHDRAWN badge correctly', () => {
    render(<StudentStatusBadge status="WITHDRAWN" />);
    expect(screen.getByText('Withdrawn')).toBeInTheDocument();
  });

  it('renders DISCONTINUED badge correctly', () => {
    render(<StudentStatusBadge status="DISCONTINUED" />);
    expect(screen.getByText('Discontinued')).toBeInTheDocument();
  });

  it('renders CANCELLED badge correctly', () => {
    render(<StudentStatusBadge status="CANCELLED" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders fallback gracefully', () => {
    render(<StudentStatusBadge status={'UNKNOWN_STATE' as unknown as StudentLifecycleStatus} />);
    expect(screen.getByText('UNKNOWN_STATE')).toBeInTheDocument();
  });
});
