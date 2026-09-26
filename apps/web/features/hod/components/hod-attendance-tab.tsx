import { AlertTriangle, Percent, Users } from 'lucide-react';

import type { HodAttendanceSummary } from '../schemas/hod.schema';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface HodAttendanceTabProps {
  attendanceData?: HodAttendanceSummary;
  isLoading: boolean;
}

export function HodAttendanceTab({ attendanceData, isLoading }: HodAttendanceTabProps) {
  const overallRate = attendanceData?.overallAttendanceRate ?? 0;
  const warningCount = attendanceData?.lowAttendanceWarningCount ?? 0;
  const totalSessions = attendanceData?.totalSessionsRecorded ?? 0;
  const recentSessions = attendanceData?.recentSessions ?? [];

  return (
    <div className="space-y-6">
      {/* Top 3 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border rounded-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Department Attendance Average
            </CardTitle>
            <Percent className="text-primary size-4" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="font-mono text-3xl font-bold tracking-tight">
              {overallRate}%
            </div>
            <Progress value={overallRate} className="h-1.5 rounded-none" />
            <p className="text-muted-foreground text-xs">Target: 75% Institutional Compliance</p>
          </CardContent>
        </Card>

        <Card className="border-border rounded-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Low Attendance Warnings
            </CardTitle>
            <AlertTriangle className="text-amber-500 size-4" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="font-mono text-3xl font-bold tracking-tight text-amber-600">
              {warningCount}
            </div>
            <p className="text-foreground text-xs font-medium">Sessions Below 75% Threshold</p>
            <p className="text-muted-foreground text-xs">Flagged for academic review</p>
          </CardContent>
        </Card>

        <Card className="border-border rounded-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Total Logged Sessions
            </CardTitle>
            <Users className="text-primary size-4" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="font-mono text-3xl font-bold tracking-tight">
              {totalSessions}
            </div>
            <p className="text-foreground text-xs font-medium">Recorded Attendance Roster</p>
            <p className="text-muted-foreground text-xs">Verified by course instructors</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance Sessions List */}
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg">Recent Department Sessions</CardTitle>
          <CardDescription>
            Audited lecture sessions and classroom student attendance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground py-12 text-center font-mono text-sm">
              Loading department attendance data...
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              No recent attendance sessions logged in this department.
            </div>
          ) : (
            <div className="divide-border divide-y">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {session.subjectCode}
                      </span>
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="text-sm font-medium text-foreground">
                        {session.subjectName}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span>Faculty: {session.facultyName}</span>
                      <span>•</span>
                      <span className="font-mono">Date: {session.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-foreground">
                        {session.presentCount} / {session.totalCount} Present
                      </div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {session.percentage}% Turnout
                      </div>
                    </div>

                    <Badge
                      variant={session.percentage >= 75 ? 'secondary' : 'outline'}
                      className={`font-mono text-xs ${
                        session.percentage < 75
                          ? 'border-amber-500/50 bg-amber-50 text-amber-700'
                          : ''
                      }`}
                    >
                      {session.percentage >= 75 ? 'Normal' : 'Low (<75%)'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
