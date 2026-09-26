import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import type { HodStudentsList } from '../schemas/hod.schema';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface HodStudentsTabProps {
  studentsData?: HodStudentsList;
  isLoading: boolean;
  page: number;
  onPageChange: (newPage: number) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export function HodStudentsTab({
  studentsData,
  isLoading,
  page,
  onPageChange,
  search,
  onSearchChange,
}: HodStudentsTabProps) {
  const students = studentsData?.students ?? [];
  const totalPages = studentsData?.totalPages ?? 1;

  return (
    <Card className="border-border rounded-none shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div>
          <CardTitle className="font-heading text-lg">Department Student Cohort</CardTitle>
          <CardDescription>
            Official enrollment registry across all departmental academic programs
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
            <input
              type="text"
              placeholder="Search by student name or roll number..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="border-border bg-background placeholder:text-muted-foreground focus:ring-primary h-9 w-full rounded-none border pl-9 pr-3 text-xs shadow-sm focus:outline-none focus:ring-1"
            />
          </div>
        </div>

        {/* Students Table */}
        <div className="border-border overflow-x-auto border">
          <table className="w-full text-left text-xs">
            <thead className="border-border bg-muted/50 text-muted-foreground border-b font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Roll Number</th>
                <th className="px-4 py-3 font-medium">Student Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Program</th>
                <th className="px-4 py-3 font-medium">Semester</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground py-12 text-center font-mono">
                    Loading student cohort roster...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground py-12 text-center">
                    {search ? 'No students match your search criteria.' : 'No students found enrolled in this department.'}
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      {student.rollNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {student.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-primary/10 text-primary font-mono text-[11px] px-1.5 py-0.5 font-semibold">
                        {student.program.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {student.currentSemester ? `Sem ${student.currentSemester}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={student.status === 'ENROLLED' ? 'secondary' : 'outline'}
                        className="font-mono text-[10px]"
                      >
                        {student.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-muted-foreground font-mono text-xs">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || isLoading}
              className="gap-1 rounded-none font-mono text-xs"
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="gap-1 rounded-none font-mono text-xs"
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
