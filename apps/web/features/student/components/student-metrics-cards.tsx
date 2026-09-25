import { AlertTriangle, BookOpen, CheckCircle2, Clock, Award } from 'lucide-react';

import type {
  StudentAcademics,
  StudentAttendanceSummary,
  StudentProfile,
} from '../schemas/student.schema';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface StudentMetricsCardsProps {
  profile: StudentProfile;
  academics?: StudentAcademics;
  attendance?: StudentAttendanceSummary;
}

export function StudentMetricsCards({ profile, academics, attendance }: StudentMetricsCardsProps) {
  const overallPercentage = attendance?.overall.percentage ?? 0;
  const isAttendanceSafe = overallPercentage >= 75;

  const currentSemesterNumber = profile.currentSemester?.number ?? 1;
  const totalSemesters = profile.program.totalSemesters || 8;
  const currentSemesterMeta = academics?.allSemesters.find((s) => s.isCurrent);
  const totalCredits = currentSemesterMeta?.totalCredits ?? 0;
  const totalSubjects = currentSemesterMeta?.totalSubjects ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Attendance Metric */}
      <Card className="border-border rounded-none">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Overall Attendance
          </CardTitle>
          {isAttendanceSafe ? (
            <CheckCircle2 className="size-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="size-4 text-amber-500" />
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold tracking-tight">
              {overallPercentage}%
            </span>
            <span
              className={`text-xs font-semibold ${
                isAttendanceSafe
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {isAttendanceSafe ? 'Good Standing' : 'Min. 75% Req.'}
            </span>
          </div>
          <Progress value={Math.min(100, Math.max(0, overallPercentage))} />
          <p className="text-muted-foreground text-xs">
            {attendance
              ? `${attendance.overall.presentSessions} attended / ${attendance.overall.totalSessions} sessions`
              : 'No session records yet'}
          </p>
        </CardContent>
      </Card>

      {/* Current Academic Term */}
      <Card className="border-border rounded-none">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Active Semester
          </CardTitle>
          <Clock className="text-primary size-4" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-3xl font-bold tracking-tight">
            Sem {currentSemesterNumber}
          </div>
          <p className="text-foreground text-xs font-medium">
            {profile.currentSemester?.academicYearLabel ?? 'Current Academic Term'}
          </p>
          <p className="text-muted-foreground text-xs">
            Status: {profile.currentSemester?.status ?? 'IN_PROGRESS'}
          </p>
        </CardContent>
      </Card>

      {/* Registered Course Load */}
      <Card className="border-border rounded-none">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Current Course Load
          </CardTitle>
          <BookOpen className="text-primary size-4" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-3xl font-bold tracking-tight">
            {totalSubjects}{' '}
            <span className="text-muted-foreground text-lg font-normal">Courses</span>
          </div>
          <p className="text-foreground text-xs font-medium">{totalCredits} Total Credits</p>
          <p className="text-muted-foreground text-xs">Scheme: {profile.curriculumVersion.label}</p>
        </CardContent>
      </Card>

      {/* Program Progression */}
      <Card className="border-border rounded-none">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Degree Progression
          </CardTitle>
          <Award className="text-primary size-4" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold tracking-tight">
              {Math.round((currentSemesterNumber / totalSemesters) * 100)}%
            </span>
            <span className="text-muted-foreground text-xs">
              Sem {currentSemesterNumber} of {totalSemesters}
            </span>
          </div>
          <Progress value={Math.round((currentSemesterNumber / totalSemesters) * 100)} />
          <p className="text-muted-foreground text-xs">
            {profile.program.durationYears} Years Total Duration
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
