import type { ReactNode } from 'react';

import { AuthFooter, AuthHeader } from '@/features/auth';

/**
 * Public authentication layout shell for S.P.A.R.K.
 *
 * Implements a clean, institutional enterprise application frame inspired by
 * Microsoft Dynamics 365 Business Central:
 * - Top: Compact enterprise application header with institutional identity & IT Helpdesk.
 * - Center: Task-oriented centered card surface on clean light-gray/dark background.
 * - Bottom: Subtle institutional attribution footer for HVPM COET.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground relative flex min-h-screen flex-col justify-between antialiased">
      {/* Top Enterprise Application Header */}
      <AuthHeader />

      {/* Centered Enterprise Authentication Workspace */}
      <main className="relative mx-auto flex w-full max-w-7xl flex-1 items-center justify-center p-3 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Institutional Enterprise Footer */}
      <AuthFooter />
    </div>
  );
}
