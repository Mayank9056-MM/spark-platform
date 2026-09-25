'use client';

import { AlertCircle, BookOpen, GraduationCap } from 'lucide-react';

import { RequireRole } from '@/components/auth/require-role';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { StudentSubjectsTable, useStudentAcademics, useStudentSubjects } from '@/features/student';

function StudentAcademicsContent() {
  const {
    data: academics,
    isLoading: isAcademicsLoading,
    error: academicsError,
  } = useStudentAcademics();
  const { data: subjects = [], isLoading: isSubjectsLoading } = useStudentSubjects();

  if (isAcademicsLoading || isSubjectsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-none" />
        <Skeleton className="h-72 rounded-none" />
      </div>
    );
  }

  if (academicsError || !academics) {
    return (
      <Alert variant="destructive" className="rounded-none">
        <AlertCircle className="size-4" />
        <AlertTitle>Error loading academic curriculum</AlertTitle>
        <AlertDescription>
          {academicsError?.message ?? 'Could not load student academic program.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight">
          Academic Program & Curriculum
        </h1>
        <p className="text-muted-foreground text-sm">
          Degree requirements, semester curriculum breakdown, and registered courses.
        </p>
      </div>

      {/* Program Summary Card */}
      <Card className="border-border rounded-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <GraduationCap className="text-primary size-4" />
            Program Overview
          </CardTitle>
          <CardDescription>
            {academics.program.name} ({academics.program.code})
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Department</span>
            <p className="text-sm font-semibold">{academics.department.name}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Curriculum Scheme</span>
            <p className="text-sm font-semibold">{academics.curriculumVersion.label}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Duration</span>
            <p className="text-sm font-semibold">
              {academics.program.durationYears} Years ({academics.program.totalSemesters} Semesters)
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Current Term</span>
            <p className="font-mono text-sm font-semibold">
              {academics.currentSemester
                ? `Sem ${academics.currentSemester.number} (${academics.currentSemester.academicYearLabel})`
                : 'Not Enrolled'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active Semester Registered Courses */}
      <StudentSubjectsTable subjects={subjects} />

      {/* Curriculum Scheme Semester Outline */}
      <Card className="border-border rounded-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BookOpen className="text-primary size-4" />
            Curriculum Structure Outline
          </CardTitle>
          <CardDescription>
            All semesters specified under {academics.curriculumVersion.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semester</TableHead>
                  <TableHead className="text-right">Total Subjects</TableHead>
                  <TableHead className="text-right">Total Credits</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {academics.allSemesters.map((sem) => (
                  <TableRow key={sem.catalogId}>
                    <TableCell className="font-semibold">Semester {sem.number}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {sem.totalSubjects}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {sem.totalCredits}
                    </TableCell>
                    <TableCell className="text-right">
                      {sem.isCurrent ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] font-semibold text-emerald-700 uppercase dark:text-emerald-400"
                        >
                          Current Term
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          Catalog
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudentAcademicsPage() {
  return (
    <RequireRole allow={['student']}>
      <StudentAcademicsContent />
    </RequireRole>
  );
}
