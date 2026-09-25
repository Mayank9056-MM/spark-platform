'use client';

import { useParams } from 'next/navigation';

import { RequirePermission } from '@/components/auth/require-permission';
import { CurriculumDetailView } from '@/features/academics';

export default function CurriculumDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  return (
    <RequirePermission require="curriculumVersion:read">
      <CurriculumDetailView id={id} />
    </RequirePermission>
  );
}
