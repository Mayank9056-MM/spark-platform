import type { ReactNode } from 'react';

import { ProtectedBoundary } from '@/components/layout/protected-boundary';
import { AuthProvider } from '@/features/auth';

/**
 * The authenticated application boundary for everything under /app.
 * Stays a Server Component itself — the only thing it does is mount
 * the one client boundary (AuthProvider + ProtectedBoundary) that
 * performs the actual GET /auth/me bootstrap, since that requires
 * TanStack Query and browser cookies, neither of which run here.
 */
export default function ProtectedAppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedBoundary>{children}</ProtectedBoundary>
    </AuthProvider>
  );
}
