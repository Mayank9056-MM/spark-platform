'use client';

import * as React from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { PageHeader } from '@/components/erp/page-header';
import { StudentOnboardingWizard } from '@/features/students/components/student-onboarding-wizard';

export default function NewStudentOnboardingPage() {
  return (
    <RequirePermission require="student:create">
      <div className="space-y-6">
        <PageHeader
          title="Student Onboarding Wizard"
          description="Provision student identity, establish confirmed admission, and allocate operational roll number."
          badge="Admissions & Academic Office"
        />
        <StudentOnboardingWizard />
      </div>
    </RequirePermission>
  );
}
