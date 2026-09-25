'use client';

import {
  ArrowRightIcon,
  BookOpenIcon,
  Building2Icon,
  CalendarIcon,
  GraduationCapIcon,
  LayersIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { PageHeader } from '@/components/erp/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcademicYears } from '@/features/academics/hooks/use-academic-years';
import { useCurricula } from '@/features/academics/hooks/use-curricula';
import { useDepartments } from '@/features/academics/hooks/use-departments';
import { usePrograms } from '@/features/academics/hooks/use-programs';

export default function AcademicsPage() {
  const { data: deptData, isLoading: deptsLoading } = useDepartments({ limit: 5 });
  const { data: progData, isLoading: progsLoading } = usePrograms({ limit: 5 });
  const { data: currData, isLoading: currsLoading } = useCurricula({ limit: 5 });
  const { data: yearData, isLoading: yearsLoading } = useAcademicYears({ limit: 5 });

  const activeYear = yearData?.items?.find((y) => y.isActive);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Structure"
        description="Institutional governance of departments, degree programs, curriculum regulations, and academic terms for HVPM COET."
      />

      {/* Operational Summary Band */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Departments
            </CardTitle>
            <Building2Icon className="text-primary size-4" />
          </CardHeader>
          <CardContent>
            {deptsLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground text-2xl font-bold">
                {deptData?.pagination.total ?? 0}
              </div>
            )}
            <p className="text-muted-foreground mt-1 text-[11px]">Configured academic faculties</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Degree Programs
            </CardTitle>
            <GraduationCapIcon className="text-primary size-4" />
          </CardHeader>
          <CardContent>
            {progsLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground text-2xl font-bold">
                {progData?.pagination.total ?? 0}
              </div>
            )}
            <p className="text-muted-foreground mt-1 text-[11px]">
              Undergraduate &amp; postgraduate degrees
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Curricula &amp; Syllabi
            </CardTitle>
            <LayersIcon className="text-primary size-4" />
          </CardHeader>
          <CardContent>
            {currsLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground text-2xl font-bold">
                {currData?.pagination.total ?? 0}
              </div>
            )}
            <p className="text-muted-foreground mt-1 text-[11px]">
              Regulations &amp; course structures
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Active Session
            </CardTitle>
            <CalendarIcon className="text-primary size-4" />
          </CardHeader>
          <CardContent>
            {yearsLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : activeYear ? (
              <div className="flex items-center gap-2">
                <span className="text-foreground font-mono text-xl font-bold">
                  {activeYear.label}
                </span>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-700 uppercase dark:text-emerald-400"
                >
                  Active
                </Badge>
              </div>
            ) : (
              <span className="text-sm font-medium text-amber-600">No session set active</span>
            )}
            <p className="text-muted-foreground mt-1 text-[11px]">
              Current operational enrollment year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Role Center Sections */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Section 1: Academic Departments */}
        <Card className="border-border/80 flex flex-col justify-between shadow-sm">
          <CardHeader className="border-border/40 border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Building2Icon className="text-primary size-4" />
                  <span>Departments Directory</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Administrative divisions housing specialized study branches.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                render={<Link href="/app/academics/departments" />}
              >
                <span>Manage</span>
                <ArrowRightIcon className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            {deptsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : deptData?.items?.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-xs italic">
                No academic departments configured yet.
              </p>
            ) : (
              <div className="divide-border/40 divide-y text-xs">
                {deptData?.items?.map((dept) => (
                  <div key={dept.id} className="flex items-center justify-between py-2.5">
                    <div className="flex flex-col">
                      <span className="text-foreground font-semibold">{dept.name}</span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        Code: {dept.code}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Academic Programs */}
        <Card className="border-border/80 flex flex-col justify-between shadow-sm">
          <CardHeader className="border-border/40 border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <GraduationCapIcon className="text-primary size-4" />
                  <span>Degree Programs</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Degree curricula, durations, and credit structures.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                render={<Link href="/app/academics/programs" />}
              >
                <span>Manage</span>
                <ArrowRightIcon className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            {progsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : progData?.items?.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-xs italic">
                No academic programs configured yet.
              </p>
            ) : (
              <div className="divide-border/40 divide-y text-xs">
                {progData?.items?.map((prog) => (
                  <div key={prog.id} className="flex items-center justify-between py-2.5">
                    <div className="flex flex-col">
                      <span className="text-foreground font-semibold">{prog.name}</span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {prog.code} &bull; {prog.durationYears} Years ({prog.totalSemesters} Sem)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Curricula & Syllabi */}
        <Card className="border-border/80 flex flex-col justify-between shadow-sm">
          <CardHeader className="border-border/40 border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <BookOpenIcon className="text-primary size-4" />
                  <span>Curricula &amp; Regulations</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Academic regulation versions, term syllabi, and course structures.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                render={<Link href="/app/academics/curricula" />}
              >
                <span>Manage</span>
                <ArrowRightIcon className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            {currsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : currData?.items?.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-xs italic">
                No curriculum versions configured yet.
              </p>
            ) : (
              <div className="divide-border/40 divide-y text-xs">
                {currData?.items?.map((curr) => (
                  <div key={curr.id} className="flex items-center justify-between py-2.5">
                    <div className="flex flex-col">
                      <span className="text-foreground font-mono font-semibold">{curr.label}</span>
                      <span className="text-muted-foreground text-[11px]">
                        Status: {curr.status}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] uppercase ${
                        curr.status === 'ACTIVE'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : curr.status === 'DRAFT'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {curr.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Academic Years */}
        <Card className="border-border/80 flex flex-col justify-between shadow-sm">
          <CardHeader className="border-border/40 border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarIcon className="text-primary size-4" />
                  <span>Academic Sessions &amp; Terms</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Institutional enrollment years and validity terms.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                render={<Link href="/app/academics/academic-years" />}
              >
                <span>Manage</span>
                <ArrowRightIcon className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            {yearsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : yearData?.items?.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-xs italic">
                No academic years configured yet.
              </p>
            ) : (
              <div className="divide-border/40 divide-y text-xs">
                {yearData?.items?.map((year) => (
                  <div key={year.id} className="flex items-center justify-between py-2.5">
                    <div className="flex flex-col">
                      <span className="text-foreground font-mono font-semibold">{year.label}</span>
                      <span className="text-muted-foreground text-[11px]">
                        {year.startDate} to {year.endDate}
                      </span>
                    </div>
                    {year.isActive && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-700 uppercase dark:text-emerald-400"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
