import type { ReactNode } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';

export default function AdmissionsLayout({ children }: { children: ReactNode }) {
  return <RequirePermission require="admission:read">{children}</RequirePermission>;
}
