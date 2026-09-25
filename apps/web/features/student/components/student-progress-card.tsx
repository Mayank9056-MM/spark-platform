import { Award, History } from 'lucide-react';

import type { StudentProgress } from '../schemas/student.schema';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StudentProgressCardProps {
  progress: StudentProgress;
}

export function StudentProgressCard({ progress }: StudentProgressCardProps) {
  return (
    <div className="space-y-6">
      {/* Semester Enrollment Progression History */}
      <Card className="border-border rounded-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <History className="text-primary size-4" />
            Semester Enrollment Record
          </CardTitle>
          <CardDescription>Chronological academic progression and term enrollments</CardDescription>
        </CardHeader>
        <CardContent>
          {progress.enrollmentHistory.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No enrollment history available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semester</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead className="text-center">Attempt</TableHead>
                    <TableHead>Commenced</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progress.enrollmentHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-foreground font-semibold">
                        Semester {item.semesterNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {item.academicYearLabel}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        #{item.attemptNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(item.startedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] uppercase ${
                            item.status === 'IN_PROGRESS'
                              ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Institutional Promotion Decisions */}
      <Card className="border-border rounded-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Award className="text-primary size-4" />
            Institutional Promotion Decisions
          </CardTitle>
          <CardDescription>
            Official progression endorsements evaluated by the Academic Board
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progress.promotionDecisions.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No formal promotion board decisions on record yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Decision</TableHead>
                    <TableHead>Stage Transition</TableHead>
                    <TableHead>Evaluation Date</TableHead>
                    <TableHead>Board Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progress.promotionDecisions.map((decision) => (
                    <TableRow key={decision.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                        >
                          {decision.decision}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        Sem {decision.fromSemesterNumber}
                        {decision.toSemesterNumber ? ` → Sem ${decision.toSemesterNumber}` : ''}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(decision.decidedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {decision.remarks ?? 'Standard promotion criteria fulfilled.'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
