import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AdmissionStatus } from '../schemas/admission.schema';

import { AdmissionStatusBadge } from './admission-status-badge';

describe('AdmissionStatusBadge', () => {
  it('renders CONFIRMED badge correctly', () => {
    render(<AdmissionStatusBadge status="CONFIRMED" />);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('renders CANCELLED badge correctly', () => {
    render(<AdmissionStatusBadge status="CANCELLED" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders unknown/fallback status gracefully', () => {
    render(<AdmissionStatusBadge status={'PENDING' as unknown as AdmissionStatus} />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });
});
