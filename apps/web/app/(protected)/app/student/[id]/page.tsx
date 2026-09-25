'use client';

import { useParams } from 'next/navigation';
import * as React from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { PageHeader } from '@/components/erp/page-header';
import { StudentProfileView } from '@/features/students/components/student-profile-view';

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const enrollmentId = params?.id ?? '';

  return (
    <RequirePermission require="student:read">
      <div className="space-y-6">
        <PageHeader
          title="Student Profile & Enrollment"
          description="Academic identity, program enrollment status, and institutional admission parameters."
          badge="Academic Records"
        />
        <StudentProfileView enrollmentId={enrollmentId} />
      </div>
    </RequirePermission>
  );
}
