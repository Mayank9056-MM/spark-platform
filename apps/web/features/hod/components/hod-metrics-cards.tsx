import {
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Percent,
  School,
  Users,
} from 'lucide-react';

import type { HodOverview } from '../schemas/hod.schema';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface HodMetricsCardsProps {
  overview: HodOverview;
}

export function HodMetricsCards({ overview }: HodMetricsCardsProps) {
  const { metrics } = overview;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* Total Programs */}
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Programs
          </CardTitle>
          <School className="text-primary size-4" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-2xl font-bold tracking-tight">
            {metrics.totalPrograms}
          </div>
          <p className="text-foreground text-xs font-medium">Curricula Enrolled</p>
          <p className="text-muted-foreground text-[10px]">Academic Degree Offerings</p>
        </CardContent>
      </Card>

      {/* Total Faculty */}
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Faculty
          </CardTitle>
          <Users className="text-primary size-4" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-2xl font-bold tracking-tight">
            {metrics.totalFaculty}
          </div>
          <p className="text-foreground text-xs font-medium">Department Faculty</p>
          <p className="text-muted-foreground text-[10px]">Teaching & Mentoring Staff</p>
        </CardContent>
      </Card>

      {/* Total Students */}
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Students
          </CardTitle>
          <GraduationCap className="text-primary size-4" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-2xl font-bold tracking-tight">
            {metrics.totalStudents}
          </div>
          <p className="text-foreground text-xs font-medium">Enrolled Cohort</p>
          <p className="text-muted-foreground text-[10px]">Undergrad & Postgrad Roster</p>
        </CardContent>
      </Card>

      {/* Active Subjects */}
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Subjects
          </CardTitle>
          <BookOpen className="text-primary size-4" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-2xl font-bold tracking-tight">
            {metrics.activeSubjects}
          </div>
          <p className="text-foreground text-xs font-medium">Active Courses</p>
          <p className="text-muted-foreground text-[10px]">Current Semester Syllabus</p>
        </CardContent>
      </Card>

      {/* Today's Lectures */}
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Today&apos;s Classes
          </CardTitle>
          <CalendarCheck className="text-primary size-4" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-2xl font-bold tracking-tight">
            {metrics.todayClassesCount}
          </div>
          <p className="text-foreground text-xs font-medium">Lectures & Labs</p>
          <p className="text-muted-foreground text-[10px]">Scheduled Daily Roster</p>
        </CardContent>
      </Card>

      {/* Overall Attendance Rate */}
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Attendance
          </CardTitle>
          <Percent className="text-primary size-4" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="font-mono text-2xl font-bold tracking-tight">
              {metrics.attendanceRate}%
            </div>
            <span
              className={`font-mono text-[10px] font-semibold ${
                metrics.attendanceRate >= 75 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {metrics.attendanceRate >= 75 ? 'Optimal' : 'Needs Review'}
            </span>
          </div>
          <Progress
            value={metrics.attendanceRate}
            className="h-1.5 rounded-none"
          />
          <p className="text-muted-foreground text-[10px]">Threshold: 75% Institutional</p>
        </CardContent>
      </Card>
    </div>
  );
}
