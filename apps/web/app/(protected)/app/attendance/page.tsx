'use client';

import { ModuleNotConnected } from '@/components/erp/module-not-connected';
import { ModuleShell } from '@/components/erp/module-shell';

export default function AttendancePage() {
  return (
    <ModuleShell title="Attendance" description="Attendance sessions and records.">
      <ModuleNotConnected resource="Attendance records" />
    </ModuleShell>
  );
}
