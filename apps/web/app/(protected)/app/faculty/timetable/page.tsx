'use client';

import { RequireRole } from '@/components/auth/require-role';
import { FacultyTimetableCard, useFacultyTimetable } from '@/features/faculty';

export default function FacultyTimetablePage() {
  const { data: timetable = [], isLoading } = useFacultyTimetable();

  return (
    <RequireRole allow={['faculty', 'hod', 'admin', 'super_admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight">
            Weekly Instructional Schedule
          </h1>
          <p className="text-muted-foreground text-sm">
            Recurring weekly timetable slots, room assignments, and cohort class allocations.
          </p>
        </div>

        <FacultyTimetableCard timetable={timetable} isLoading={isLoading} />
      </div>
    </RequireRole>
  );
}
