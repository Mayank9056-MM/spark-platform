'use client';

import { AlertCircle } from 'lucide-react';
import * as React from 'react';

import {
  useStudentAcademics,
  useStudentAttendance,
  useStudentProfile,
  useStudentSubjects,
  useStudentTimetable,
} from '../hooks/use-student';

import { StudentAttendanceCard } from './student-attendance-card';
import { StudentHeader } from './student-header';
import { StudentMetricsCards } from './student-metrics-cards';
import { StudentSubjectsTable } from './student-subjects-table';
import { StudentTimetableCard } from './student-timetable-card';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Production-grade Student Dashboard Content.
 * Renders the real-data student workspace:
 * - Institutional Identity & Enrolled Program Banner
 * - Academic Metrics (CGPA, Attendance %, Credits, Backlogs)
 * - Weekly Lecture Timetable
 * - Enrolled Subjects & Syllabi
 * - Attendance Records
 */
export function StudentDashboardContent() {
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useStudentProfile();
  const { data: academics } = useStudentAcademics();
  const { data: attendance } = useStudentAttendance();
  const { data: subjects = [] } = useStudentSubjects();
  const { data: timetable = [] } = useStudentTimetable();

  if (isProfileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-none" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-none" />
          <Skeleton className="h-28 rounded-none" />
          <Skeleton className="h-28 rounded-none" />
          <Skeleton className="h-28 rounded-none" />
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-80 rounded-none lg:col-span-7" />
          <Skeleton className="h-80 rounded-none lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <Alert variant="destructive" className="rounded-none">
        <AlertCircle className="size-4" />
        <AlertTitle>Unable to load student record</AlertTitle>
        <AlertDescription>
          {profileError?.message ??
            'No active student enrollment record was found associated with your user account. Please contact the college registrar.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <StudentHeader profile={profile} />

      <StudentMetricsCards profile={profile} academics={academics} attendance={attendance} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <StudentTimetableCard entries={timetable} compact />
          <StudentSubjectsTable subjects={subjects} />
        </div>

        <div className="space-y-6 lg:col-span-5">
          {attendance && <StudentAttendanceCard attendance={attendance} compact />}
        </div>
      </div>
    </div>
  );
}
