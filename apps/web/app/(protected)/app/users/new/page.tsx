'use client';

import { PageHeader } from '@/components/erp/page-header';
import { UserForm } from '@/features/users/components/user-form';

export default function NewUserPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Provision New User"
        description="Create an institutional user account and issue access credentials."
      />
      <UserForm mode="create" />
    </div>
  );
}
