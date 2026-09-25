'use client';

import { PlusIcon, UserPlusIcon } from 'lucide-react';
import Link from 'next/link';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { AdmissionsTable } from '@/features/admissions/components/admissions-table';

export default function AdmissionsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Student Admissions"
        description="Institutional student admission registry, quota allocations, and enrollment confirmations."
        actions={
          <div className="flex items-center gap-2">
            <PermissionGuard require="admission:create">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                render={<Link href="/app/admissions/new" />}
              >
                <PlusIcon className="size-3.5" />
                <span>Record Admission</span>
              </Button>
            </PermissionGuard>
            <PermissionGuard require="student:create">
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                render={<Link href="/app/student/new" />}
              >
                <UserPlusIcon className="size-3.5" />
                <span>Onboard Student (All-in-One)</span>
              </Button>
            </PermissionGuard>
          </div>
        }
      />
      <AdmissionsTable />
    </div>
  );
}
