import type { ReactNode } from 'react';

import { RequireRole } from '@/components/auth/require-role';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <RequireRole allow={['student']}>{children}</RequireRole>;
}
