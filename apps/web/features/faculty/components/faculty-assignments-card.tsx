import { BookOpen } from 'lucide-react';

import type { FacultyAssignment } from '../schemas/faculty.schema';

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

interface FacultyAssignmentsCardProps {
  assignments: FacultyAssignment[];
  isLoading?: boolean;
}

export function FacultyAssignmentsCard({ assignments, isLoading }: FacultyAssignmentsCardProps) {
  return (
    <Card className="border-border rounded-none shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-bold">
          Allocated Courses & Workload
        </CardTitle>
        <CardDescription>
          Curricular subjects, component breakdown, and allocated weekly hours
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground flex h-32 items-center justify-center text-xs">
            Loading course allocations…
          </div>
        ) : assignments.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center border border-dashed px-4 py-10 text-center">
            <div className="bg-muted text-muted-foreground mb-3 rounded-full p-3">
              <BookOpen className="size-6" />
            </div>
            <h3 className="font-heading text-sm font-semibold">No Teaching Allocations Found</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
              Your account currently has no active teaching allocations for this academic term.
              Contact your Department Head or Academic Coordinator for course assignment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Course Code</TableHead>
                  <TableHead className="font-semibold">Subject Title</TableHead>
                  <TableHead className="font-semibold">Component</TableHead>
                  <TableHead className="text-center font-semibold">Hours/Wk</TableHead>
                  <TableHead className="text-center font-semibold">Credits</TableHead>
                  <TableHead className="font-semibold">Program / Term</TableHead>
                  <TableHead className="text-center font-semibold">Lectures</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="text-foreground font-mono text-xs font-semibold">
                      {assignment.subject.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{assignment.subject.name}</span>
                        {assignment.subject.isElective && (
                          <span className="text-muted-foreground text-[10px]">Elective Course</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px] font-semibold uppercase"
                      >
                        {assignment.component.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-bold">
                      {assignment.component.hoursPerWeek} hrs
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {assignment.component.credits}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {assignment.program.code} · Sem {assignment.semesterCatalog.number}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-semibold">
                      {assignment.totalLecturesCount}
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
