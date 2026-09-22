import type { ReactNode } from 'react';

import { RequireRole } from '@/components/auth/require-role';

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <RequireRole allow={['super_admin']}>{children}</RequireRole>;
}
