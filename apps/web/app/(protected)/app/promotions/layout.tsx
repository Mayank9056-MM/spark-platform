import type { ReactNode } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';

export default function PromotionsLayout({ children }: { children: ReactNode }) {
  return <RequirePermission require="promotion:read">{children}</RequirePermission>;
}
