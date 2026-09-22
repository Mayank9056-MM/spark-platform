import type { ReactNode } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';

export default function TimetableLayout({ children }: { children: ReactNode }) {
  return <RequirePermission require="timetable:read">{children}</RequirePermission>;
}
