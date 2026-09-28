'use client';

import { BookOpenIcon, CalendarIcon, LayersIcon, PlusIcon, RefreshCwIcon } from 'lucide-react';
import * as React from 'react';

import { useSemesterEnrollments } from '../hooks/use-semester-enrollments';

import { CreateSemesterEnrollmentDialog } from './create-semester-enrollment-dialog';
import { SemesterEnrollmentStatusBadge } from './semester-enrollment-status-badge';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAcademicYears } from '@/features/academics/hooks/use-academic-years';
import { useSemesterCatalogs } from '@/features/academics/hooks/use-semester-catalogs';
import { formatDate } from '@/lib/formatters';

interface StudentSemesterEnrollmentsCardProps {
  studentEnrollmentId: string;
  curriculumVersionId: string;
  studentRollNumber?: string;
  isEnrollmentActive?: boolean;
  entrySemesterCatalogId?: string;
}

export function StudentSemesterEnrollmentsCard({
  studentEnrollmentId,
  curriculumVersionId,
  studentRollNumber,
  isEnrollmentActive = true,
  entrySemesterCatalogId,
}: StudentSemesterEnrollmentsCardProps) {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const {
    data: enrollmentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useSemesterEnrollments({
    studentEnrollmentId,
    limit: 50,
    sortBy: 'attemptNumber',
    sortOrder: 'asc',
  });

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const { data: semestersData } = useSemesterCatalogs(
    curriculumVersionId ? { curriculumVersionId, limit: 100 } : undefined,
  );

  const academicYearMap = React.useMemo(() => {
    const map = new Map<string, string>();
    academicYearsData?.items.forEach((y) => map.set(y.id, y.label));
    return map;
  }, [academicYearsData]);

  const semesterNumberMap = React.useMemo(() => {
    const map = new Map<string, number>();
    semestersData?.items.forEach((s) => map.set(s.id, s.number));
    return map;
  }, [semestersData]);

  const enrollments = enrollmentsData?.items ?? [];

  return (
    <>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-border/40 flex flex-row items-center justify-between border-b pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <LayersIcon className="text-primary size-4" />
              <span>Semester Enrollments & Progression Attempts</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Curriculum terms attempted and institutional standing.
            </CardDescription>
          </div>
          {isEnrollmentActive && (
            <PermissionGuard require="student:create">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={() => setCreateDialogOpen(true)}
              >
                <PlusIcon className="size-3.5" />
                <span>Enroll in Semester</span>
              </Button>
            </PermissionGuard>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : isError ? (
            <div className="space-y-2 p-6 text-center">
              <p className="text-destructive text-xs">
                {error?.message ?? 'Failed to load semester enrollments.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  void refetch();
                }}
              >
                <RefreshCwIcon className="mr-1 size-3" />
                <span>Retry</span>
              </Button>
            </div>
          ) : enrollments.length === 0 ? (
            <div className="p-6 text-center">
              <LayersIcon className="text-muted-foreground/60 mx-auto size-8" />
              <p className="text-foreground mt-2 text-xs font-medium">
                No semester enrollments recorded
              </p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {isEnrollmentActive
                  ? 'Click "Enroll in Semester" to register the initial semester attempt.'
                  : 'This student has no active or past semester enrollments.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 bg-muted/20">
                    <TableHead className="text-muted-foreground px-4 py-2.5 text-[11px] font-semibold uppercase">
                      Attempt #
                    </TableHead>
                    <TableHead className="text-muted-foreground px-4 py-2.5 text-[11px] font-semibold uppercase">
                      Curriculum Semester
                    </TableHead>
                    <TableHead className="text-muted-foreground px-4 py-2.5 text-[11px] font-semibold uppercase">
                      Academic Session
                    </TableHead>
                    <TableHead className="text-muted-foreground px-4 py-2.5 text-[11px] font-semibold uppercase">
                      Status
                    </TableHead>
                    <TableHead className="text-muted-foreground px-4 py-2.5 text-[11px] font-semibold uppercase">
                      Enrolled Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enr) => {
                    const semNumber = semesterNumberMap.get(enr.semesterCatalogId);
                    const yearLabel = academicYearMap.get(enr.academicYearId);

                    return (
                      <TableRow key={enr.id} className="border-border/40 hover:bg-muted/10">
                        <TableCell className="px-4 py-2.5 font-mono text-xs font-semibold">
                          Attempt {enr.attemptNumber}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-xs font-medium">
                          <div className="flex items-center gap-1.5">
                            <BookOpenIcon className="text-muted-foreground size-3.5" />
                            <span>
                              {semNumber !== undefined ? `Semester ${semNumber}` : 'Semester'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2.5 font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="text-muted-foreground size-3.5" />
                            <span>{yearLabel ?? enr.academicYearId.slice(0, 8)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2.5">
                          <SemesterEnrollmentStatusBadge status={enr.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground px-4 py-2.5 font-mono text-xs">
                          {formatDate(enr.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateSemesterEnrollmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        studentEnrollmentId={studentEnrollmentId}
        curriculumVersionId={curriculumVersionId}
        studentRollNumber={studentRollNumber}
        entrySemesterCatalogId={entrySemesterCatalogId}
      />
    </>
  );
}
