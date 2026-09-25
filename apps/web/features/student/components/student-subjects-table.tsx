import { BookOpen } from 'lucide-react';

import type { StudentSubject } from '../schemas/student.schema';

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

interface StudentSubjectsTableProps {
  subjects: StudentSubject[];
}

export function StudentSubjectsTable({ subjects }: StudentSubjectsTableProps) {
  const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0);

  return (
    <Card className="border-border rounded-none">
      <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BookOpen className="text-primary size-4" />
            Registered Curriculum Courses
          </CardTitle>
          <CardDescription>
            Official course registrations and credit assignments for the active semester
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {subjects.length} Courses • {totalCredits} Total Credits
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {subjects.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No registered subjects found for this semester.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead>Subject Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Components (Hours/Wk)</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subj) => (
                  <TableRow key={subj.id}>
                    <TableCell className="font-mono text-xs font-semibold">{subj.code}</TableCell>
                    <TableCell>
                      <div className="text-foreground font-medium">{subj.name}</div>
                      {subj.isElective && subj.electiveGroupName && (
                        <span className="text-muted-foreground text-xs">
                          Elective Group: {subj.electiveGroupName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] uppercase ${
                          subj.isElective
                            ? 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400'
                            : 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400'
                        }`}
                      >
                        {subj.isElective ? 'Elective' : 'Core'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {subj.components.map((comp) => (
                          <Badge
                            key={comp.id}
                            variant="secondary"
                            className="font-mono text-[10px]"
                          >
                            {comp.type}: {comp.hoursPerWeek}h ({comp.credits}cr)
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground text-right font-mono font-semibold">
                      {subj.credits}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
