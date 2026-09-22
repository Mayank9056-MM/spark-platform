'use client';

import { ModuleNotConnected } from '@/components/erp/module-not-connected';
import { ModuleShell } from '@/components/erp/module-shell';

export default function TimetablePage() {
  return (
    <ModuleShell title="Timetable" description="Scheduled lectures across subjects and rooms.">
      <ModuleNotConnected resource="Timetable entries" />
    </ModuleShell>
  );
}
