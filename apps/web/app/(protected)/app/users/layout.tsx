import type { ReactNode } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';

export default function UsersLayout({ children }: { children: ReactNode }) {
  return <RequirePermission require="user:read">{children}</RequirePermission>;
}
