import type { ReactNode } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';

const ACADEMIC_READ_PERMISSIONS = [
  'department:read',
  'program:read',
  'curriculumVersion:read',
  'subject:read',
  'academicYear:read',
  'electiveGroup:read',
];

export default function AcademicsLayout({ children }: { children: ReactNode }) {
  return <RequirePermission require={ACADEMIC_READ_PERMISSIONS}>{children}</RequirePermission>;
}
