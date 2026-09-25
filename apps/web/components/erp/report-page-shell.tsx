'use client';

import { DownloadIcon, FileSpreadsheetIcon, FilterIcon, RefreshCwIcon } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ReportFilter {
  id: string;
  label: string;
  options: readonly string[];
}

export interface ReportPageShellProps {
  title: string;
  description: string;
  reportCode?: string;
  filters?: readonly ReportFilter[];
  children?: React.ReactNode;
}

/**
 * Enterprise Report Page pattern inspired by Microsoft Dynamics 365 Business Central.
 * Features:
 * - Report identifier and code
 * - Filter criteria bar (Date, Department, Program, Semester)
 * - Export actions (Excel / PDF / CSV)
 * - Controlled results canvas
 */
export function ReportPageShell({
  title,
  description,
  reportCode = 'REP-01',
  filters = [
    { id: 'academicYear', label: 'Academic Year', options: ['2025-26', '2024-25'] },
    { id: 'semester', label: 'Semester', options: ['Odd Semester', 'Even Semester'] },
    {
      id: 'department',
      label: 'Department',
      options: ['All Departments', 'Computer Science', 'Mechanical', 'Electrical'],
    },
  ],
  children,
}: ReportPageShellProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Navigation & Report Code */}
      <div className="border-border/70 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-foreground font-heading text-xl font-bold tracking-tight sm:text-2xl">
              {title}
            </h1>
            <Badge
              variant="outline"
              className="border-primary/30 text-primary font-mono text-[10px] uppercase"
            >
              {reportCode}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 gap-1.5 text-xs"
          >
            <RefreshCwIcon className="size-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <FileSpreadsheetIcon className="size-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold">
            <DownloadIcon className="size-3.5" />
            <span>Generate Report</span>
          </Button>
        </div>
      </div>

      {/* 2. Enterprise Filter Criteria Bar */}
      <Card className="border-border/80 bg-card rounded-lg border shadow-xs">
        <CardHeader className="border-border/70 flex flex-row items-center gap-2 border-b px-4 py-3">
          <FilterIcon className="text-primary size-3.5" aria-hidden="true" />
          <CardTitle className="text-muted-foreground font-mono text-xs font-bold tracking-wider uppercase">
            Report Parameters &amp; Filter Criteria
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {filters.map((filter) => (
              <div key={filter.id} className="space-y-1 text-xs">
                <label className="text-muted-foreground text-[11px] font-medium">
                  {filter.label}
                </label>
                <select className="border-input bg-background/60 text-foreground focus:ring-ring h-8 w-full rounded-md border px-2.5 text-xs focus:ring-1 focus:outline-none">
                  {filter.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Report Results / Canvas */}
      <div className="w-full">{children}</div>
    </div>
  );
}
