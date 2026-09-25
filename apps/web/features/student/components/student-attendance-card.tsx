import { AlertCircle, ArrowUpRight, History, ListFilter } from 'lucide-react';
import Link from 'next/link';

import type { StudentAttendanceSummary } from '../schemas/student.schema';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StudentAttendanceCardProps {
  attendance: StudentAttendanceSummary;
  compact?: boolean;
}

export function StudentAttendanceCard({ attendance, compact = false }: StudentAttendanceCardProps) {
  const isDeficit = attendance.overall.percentage < 75;

  return (
    <Card className="border-border rounded-none">
      <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ListFilter className="text-primary size-4" />
            Subject-wise Attendance
          </CardTitle>
          <CardDescription>
            Continuous attendance records across all registered subjects
          </CardDescription>
        </div>

        {compact && (
          <Link
            href="/app/student/attendance"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Full Report
            <ArrowUpRight className="ml-1 size-3.5" />
          </Link>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {isDeficit && (
          <Alert variant="destructive" className="rounded-none">
            <AlertCircle className="size-4" />
            <AlertTitle>Attendance Shortage Alert</AlertTitle>
            <AlertDescription className="text-xs">
              Your overall attendance is currently {attendance.overall.percentage}%, which is below
              the mandatory 75% institutional threshold. Please contact your HOD or faculty advisor.
            </AlertDescription>
          </Alert>
        )}

        {attendance.bySubject.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No subject attendance records recorded yet for the current term.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Attended</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[180px] text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.bySubject.map((subj) => {
                  const isSubjectSafe = subj.percentage >= 75;
                  const isSevere = subj.percentage < 65;

                  return (
                    <TableRow key={subj.subjectId}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {subj.subjectCode}
                      </TableCell>
                      <TableCell className="text-foreground font-medium">
                        {subj.subjectName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {subj.presentSessions}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right font-mono text-sm">
                        {subj.totalSessions}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <Progress value={subj.percentage} className="w-16" />
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs ${
                              isSubjectSafe
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : isSevere
                                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {subj.percentage}%
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!compact && attendance.recentRecords.length > 0 && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <History className="text-primary size-4" />
              <h3 className="text-foreground text-sm font-semibold">Recent Session Records</h3>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.recentRecords.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {rec.date}
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="text-muted-foreground mr-1.5 font-mono text-xs">
                          {rec.subjectCode}
                        </span>
                        {rec.subjectName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {rec.componentType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] uppercase ${
                            rec.status === 'PRESENT'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : rec.status === 'EXCUSED'
                                ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                : 'border-destructive/30 bg-destructive/10 text-destructive'
                          }`}
                        >
                          {rec.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
