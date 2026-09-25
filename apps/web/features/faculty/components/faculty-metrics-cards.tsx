import { BookOpen, CalendarCheck, CheckCircle2, Clock } from 'lucide-react';

import type { FacultyAttendanceSummary, FacultyProfile } from '../schemas/faculty.schema';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FacultyMetricsCardsProps {
  profile: FacultyProfile;
  attendanceSummary?: FacultyAttendanceSummary;
}

export function FacultyMetricsCards({ profile, attendanceSummary }: FacultyMetricsCardsProps) {
  const { workload } = profile;
  const attendancePercentage = attendanceSummary?.overallAttendancePercentage ?? 0;
  const totalLectures = attendanceSummary?.totalLectures ?? 0;
  const sessionsRecorded = attendanceSummary?.sessionsRecorded ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Assigned Subjects */}
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Assigned Subjects
          </CardTitle>
          <BookOpen className="text-primary size-4" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-3xl font-bold tracking-tight">
            {workload.assignedSubjectsCount}
          </div>
          <p className="text-foreground text-xs font-medium">Curricular Courses Allocated</p>
          <p className="text-muted-foreground text-xs">Theory & Practical Teaching Allocations</p>
        </CardContent>
      </Card>

      {/* Weekly Teaching Hours */}
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Weekly Workload
          </CardTitle>
          <Clock className="text-primary size-4" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-3xl font-bold tracking-tight">
            {workload.totalWeeklyHours}{' '}
            <span className="text-muted-foreground text-lg font-normal">Hrs/Wk</span>
          </div>
          <p className="text-foreground text-xs font-medium">Instructional Load</p>
          <p className="text-muted-foreground text-xs">Timetable Allocation Distribution</p>
        </CardContent>
      </Card>

      {/* Today's Lectures */}
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Today&apos;s Classes
          </CardTitle>
          <CalendarCheck className="text-primary size-4" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-3xl font-bold tracking-tight">
            {workload.todayLecturesCount}
          </div>
          <p className="text-foreground text-xs font-medium">Scheduled Today</p>
          <p className="text-muted-foreground text-xs">
            {workload.upcomingLecturesCount} Total Upcoming Lectures
          </p>
        </CardContent>
      </Card>

      {/* Attendance Compliance / Submission */}
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Student Attendance
          </CardTitle>
          <CheckCircle2 className="size-4 text-emerald-500" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold tracking-tight">
              {attendancePercentage}%
            </span>
            <span className="text-muted-foreground text-xs font-medium">
              {sessionsRecorded} / {totalLectures} Recorded
            </span>
          </div>
          <Progress value={Math.min(100, Math.max(0, attendancePercentage))} />
          <p className="text-muted-foreground text-xs">
            Average present rate across assigned classes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
