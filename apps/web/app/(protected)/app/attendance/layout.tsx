import type { ReactNode } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';

export default function AttendanceLayout({ children }: { children: ReactNode }) {
  return <RequirePermission require="attendance:read">{children}</RequirePermission>;
}
