'use client';

import { AlertCircle, BookCheck, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import {
  useFacultyAssignments,
  useFacultyAttendanceSummary,
  useFacultyLectures,
  useFacultyProfile,
  useFacultyTimetable,
} from '../hooks/use-faculty';

import { FacultyAssignmentsCard } from './faculty-assignments-card';
import { FacultyAttendanceRosterDialog } from './faculty-attendance-roster-dialog';
import { FacultyHeader } from './faculty-header';
import { FacultyMetricsCards } from './faculty-metrics-cards';
import { FacultyTimetableCard } from './faculty-timetable-card';
import { FacultyTodayScheduleCard } from './faculty-today-schedule-card';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';

export function FacultyDashboardContent() {
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);

  // Today's date string in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile,
    isRefetching: isProfileRefetching,
  } = useFacultyProfile();

  const {
    data: assignments = [],
    isLoading: isAssignmentsLoading,
    refetch: refetchAssignments,
  } = useFacultyAssignments();

  const {
    data: timetable = [],
    isLoading: isTimetableLoading,
    refetch: refetchTimetable,
  } = useFacultyTimetable();

  const {
    data: todayLectures = [],
    isLoading: isLecturesLoading,
    refetch: refetchLectures,
  } = useFacultyLectures({ date: todayStr });

  const {
    data: attendanceSummary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useFacultyAttendanceSummary();

  const handleRefreshAll = () => {
    void refetchProfile();
    void refetchAssignments();
    void refetchTimetable();
    void refetchLectures();
    void refetchSummary();
  };

  const handleOpenAttendance = (lectureId: string) => {
    setSelectedLectureId(lectureId);
    setIsAttendanceOpen(true);
  };

  if (isProfileLoading) {
    return (
      <div className="text-muted-foreground flex h-64 flex-col items-center justify-center gap-3 text-xs">
        <Spinner aria-hidden="true" className="text-primary size-6" />
        <span>Loading faculty teaching workspace…</span>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="border-destructive/20 bg-destructive/5 space-y-4 rounded-none border p-6">
        <div className="text-destructive flex items-center gap-2 font-semibold">
          <AlertCircle className="size-5" />
          <span>Unable to Load Faculty Workspace</span>
        </div>
        <p className="text-muted-foreground text-xs">
          {profileError?.message ??
            'Your account does not have an active faculty assignment or authorization. Please contact the Academic Office.'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          className="rounded-none text-xs"
        >
          <RotateCcw className="mr-1.5 size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Profile & Institutional Details */}
      <FacultyHeader
        profile={profile}
        onRefresh={handleRefreshAll}
        isRefreshing={isProfileRefetching}
      />

      {/* 2. Key Metrics & Workload Summary */}
      <FacultyMetricsCards profile={profile} attendanceSummary={attendanceSummary} />

      {/* 3. Main Operational Sections Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Today's Schedule & Subject Allocations */}
        <div className="space-y-6 lg:col-span-7">
          <FacultyTodayScheduleCard
            lectures={todayLectures}
            onSelectLecture={handleOpenAttendance}
            isLoading={isLecturesLoading}
          />

          <FacultyAssignmentsCard assignments={assignments} isLoading={isAssignmentsLoading} />
        </div>

        {/* Right Column: Weekly Timetable & Subject Attendance Performance */}
        <div className="space-y-6 lg:col-span-5">
          <FacultyTimetableCard timetable={timetable} isLoading={isTimetableLoading} />

          {/* Subject Attendance Breakdown Card */}
          <Card className="border-border rounded-none shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg font-bold">
                Course Attendance Breakdown
              </CardTitle>
              <CardDescription>
                Historical compliance and student participation rates per subject
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSummaryLoading ? (
                <div className="text-muted-foreground flex h-24 items-center justify-center text-xs">
                  Loading attendance statistics…
                </div>
              ) : !attendanceSummary || attendanceSummary.bySubject.length === 0 ? (
                <div className="border-border border border-dashed px-4 py-8 text-center">
                  <BookCheck className="text-muted-foreground mx-auto mb-2 size-6" />
                  <p className="text-muted-foreground text-xs">
                    No course attendance records recorded yet. Once classes are conducted and
                    attendance is saved, compliance stats will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {attendanceSummary.bySubject.map((item) => (
                    <div key={item.subjectId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="max-w-[200px] truncate">
                          {item.subjectCode} — {item.subjectName}
                        </span>
                        <span className="font-mono font-bold">
                          {item.attendanceRate}%{' '}
                          <span className="text-muted-foreground text-[10px] font-normal">
                            ({item.completedLectures} classes)
                          </span>
                        </span>
                      </div>
                      <Progress value={item.attendanceRate} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Interactive Attendance Marking Dialog */}
      <FacultyAttendanceRosterDialog
        lectureId={selectedLectureId}
        open={isAttendanceOpen}
        onOpenChange={setIsAttendanceOpen}
      />
    </div>
  );
}
