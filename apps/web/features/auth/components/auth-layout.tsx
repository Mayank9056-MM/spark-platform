import type { ReactNode } from 'react';

import { AuthShell } from './auth-shell';
import { HvpmLogo } from './hvpm-logo';

export { AuthMessageCard, type AuthMessageCardProps } from './auth-message-card';

export interface AuthLayoutProps {
  /** Small uppercase category badge above the main card title (e.g. "INSTITUTIONAL ACCESS") */
  badge?: string;
  /** Primary title of the authentication card */
  title: string;
  /** Subtitle or instructions below the card title */
  description?: ReactNode;
  /** Deprecated left panel context heading (kept for compatibility) */
  leftHeading?: string;
  /** Deprecated left panel narrative description (kept for compatibility) */
  leftDescription?: string;
  /** Main interactive form or card content */
  children: ReactNode;
  /** Optional secondary notice or footer inside the card */
  cardFooter?: ReactNode;
}

/**
 * Institutional Emblem.
 * Kept for backwards compatibility — delegates directly to the official HvpmLogo.
 */
export function SparkBrandMark({ className = 'size-8' }: { className?: string }) {
  return <HvpmLogo size="nav" className={className} priority={false} />;
}

/**
 * Enterprise AuthLayout for S.P.A.R.K.
 *
 * Implements the horizontal two-region enterprise architecture on desktop
 * and vertical streamlined experience on mobile via AuthShell.
 */
export function AuthLayout({ badge, title, description, children, cardFooter }: AuthLayoutProps) {
  return (
    <AuthShell badge={badge} title={title} description={description} cardFooter={cardFooter}>
      {children}
    </AuthShell>
  );
}
