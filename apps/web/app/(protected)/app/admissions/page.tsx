'use client';

import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { ModuleNotConnected } from '@/components/erp/module-not-connected';
import { ModuleShell } from '@/components/erp/module-shell';
import { buttonVariants } from '@/components/ui/button';

export default function AdmissionsPage() {
  return (
    <ModuleShell
      title="Admissions"
      description="Student admission records for the current academic year."
      actions={
        <PermissionGuard require="admission:create">
          <Link
            href="/app/admissions/new"
            data-slot="button"
            className={buttonVariants({ size: 'sm' })}
          >
            <PlusIcon aria-hidden="true" />
            Record admission
          </Link>
        </PermissionGuard>
      }
    >
      <ModuleNotConnected resource="Admission records" />
    </ModuleShell>
  );
}
