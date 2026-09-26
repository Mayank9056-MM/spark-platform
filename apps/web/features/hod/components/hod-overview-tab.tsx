import { Clock, MapPin, User } from 'lucide-react';

import type { HodOverview } from '../schemas/hod.schema';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface HodOverviewTabProps {
  overview: HodOverview;
  onNavigateTab: (tab: string) => void;
}

export function HodOverviewTab({ overview, onNavigateTab }: HodOverviewTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left 2 Cols: Programs and Schedule */}
      <div className="space-y-6 lg:col-span-2">
        {/* Department Degree Programs */}
        <Card className="border-border rounded-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="font-heading text-lg">Degree & Diploma Programs</CardTitle>
              <CardDescription>
                Academic curricula under the {overview.department.name} department
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {overview.programs.length} Active
            </Badge>
          </CardHeader>
          <CardContent>
            {overview.programs.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center text-sm">
                No active degree programs found for this department.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {overview.programs.map((prog) => (
                  <div
                    key={prog.id}
                    className="border-border bg-card hover:bg-muted/30 flex flex-col justify-between border p-4 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="bg-primary/10 text-primary font-mono text-xs font-semibold px-2 py-0.5">
                          {prog.code}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {prog.durationYears} Years
                        </span>
                      </div>
                      <h4 className="font-heading text-sm font-semibold pt-1 leading-snug">
                        {prog.name}
                      </h4>
                    </div>
                    <div className="border-border text-muted-foreground mt-3 flex items-center justify-between border-t pt-2 text-xs">
                      <span>Curriculum Versions</span>
                      <span className="font-mono font-medium text-foreground">
                        {prog.curriculumCount} Registered
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Classes & Recent Activity */}
        <Card className="border-border rounded-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="font-heading text-lg">Today&apos;s Class Schedule</CardTitle>
              <CardDescription>
                Live instructional lectures scheduled across department classrooms
              </CardDescription>
            </div>
            <button
              onClick={() => onNavigateTab('timetable')}
              className="text-primary hover:underline text-xs font-medium"
            >
              View Full Timetable →
            </button>
          </CardHeader>
          <CardContent>
            {overview.recentLectures.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">
                No lectures scheduled for today in this department.
              </div>
            ) : (
              <div className="divide-border divide-y">
                {overview.recentLectures.map((lec) => (
                  <div
                    key={lec.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {lec.subjectCode}
                        </span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-sm font-medium text-foreground">
                          {lec.subjectName}
                        </span>
                      </div>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {lec.facultyName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {lec.roomName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <Clock className="size-3.5" />
                        <span>
                          {lec.startTime} - {lec.endTime}
                        </span>
                      </div>
                      <Badge
                        variant={lec.status === 'COMPLETED' ? 'secondary' : 'outline'}
                        className="font-mono text-[10px]"
                      >
                        {lec.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right 1 Col: Quick Navigation & Department Info */}
      <div className="space-y-6">
        <Card className="border-border rounded-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg">Department Authority</CardTitle>
            <CardDescription>
              Governance & Operational Management Scope
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="border-border bg-muted/20 space-y-2 border p-3">
              <div className="text-muted-foreground text-xs uppercase tracking-wider font-mono">
                Department Entity
              </div>
              <div className="font-semibold text-foreground text-base">
                {overview.department.name}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  Code: {overview.department.code}
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs">
                  Status: {overview.department.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-muted-foreground text-xs uppercase tracking-wider font-mono">
                Academic Management Quick Links
              </div>
              <div className="grid gap-2">
                <button
                  onClick={() => onNavigateTab('faculty')}
                  className="border-border hover:bg-muted/40 flex w-full items-center justify-between border p-2.5 text-left text-xs font-medium transition-colors"
                >
                  <span>Faculty Workload & Assignments</span>
                  <span className="text-muted-foreground font-mono">→</span>
                </button>
                <button
                  onClick={() => onNavigateTab('students')}
                  className="border-border hover:bg-muted/40 flex w-full items-center justify-between border p-2.5 text-left text-xs font-medium transition-colors"
                >
                  <span>Student Enrollment Roster</span>
                  <span className="text-muted-foreground font-mono">→</span>
                </button>
                <button
                  onClick={() => onNavigateTab('timetable')}
                  className="border-border hover:bg-muted/40 flex w-full items-center justify-between border p-2.5 text-left text-xs font-medium transition-colors"
                >
                  <span>Weekly Timetable Matrix</span>
                  <span className="text-muted-foreground font-mono">→</span>
                </button>
                <button
                  onClick={() => onNavigateTab('attendance')}
                  className="border-border hover:bg-muted/40 flex w-full items-center justify-between border p-2.5 text-left text-xs font-medium transition-colors"
                >
                  <span>Attendance Audits & Alerts</span>
                  <span className="text-muted-foreground font-mono">→</span>
                </button>
                <button
                  onClick={() => onNavigateTab('promotions')}
                  className="border-border hover:bg-muted/40 flex w-full items-center justify-between border p-2.5 text-left text-xs font-medium transition-colors"
                >
                  <span>Term Promotions & Decisions</span>
                  <span className="text-muted-foreground font-mono">→</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
