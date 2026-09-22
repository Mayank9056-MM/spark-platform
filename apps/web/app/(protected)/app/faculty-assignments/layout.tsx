import type { ReactNode } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';

export default function FacultyAssignmentsLayout({ children }: { children: ReactNode }) {
  return <RequirePermission require="facultyAssignment:read">{children}</RequirePermission>;
}
