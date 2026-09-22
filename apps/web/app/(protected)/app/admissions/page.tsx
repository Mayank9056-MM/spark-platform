'use client';

import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { ModuleNotConnected } from '@/components/erp/module-not-connected';
import { ModuleShell } from '@/components/erp/module-shell';
import { Button } from '@/components/ui/button';

export default function AdmissionsPage() {
  return (
    <ModuleShell
      title="Admissions"
      description="Student admission records for the current academic year."
      actions={
        <PermissionGuard require="admission:create">
          <Button size="sm" render={<Link href="/app/admissions/new" />}>
            <PlusIcon aria-hidden="true" />
            Record admission
          </Button>
        </PermissionGuard>
      }
    >
      <ModuleNotConnected resource="Admission records" />
    </ModuleShell>
  );
}
