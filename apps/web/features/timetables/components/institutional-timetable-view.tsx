'use client';

import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import * as React from 'react';

import { useTimetables } from '../hooks/use-timetables';
import type { DayOfWeek } from '../schemas/timetable.schema';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { PageHeader } from '@/components/erp/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const DAYS_OF_WEEK = [
  { key: 'ALL', label: 'All Days' },
  { key: 'MONDAY', label: 'Monday' },
  { key: 'TUESDAY', label: 'Tuesday' },
  { key: 'WEDNESDAY', label: 'Wednesday' },
  { key: 'THURSDAY', label: 'Thursday' },
  { key: 'FRIDAY', label: 'Friday' },
  { key: 'SATURDAY', label: 'Saturday' },
] as const;

export function InstitutionalTimetableView() {
  const [selectedDay, setSelectedDay] = React.useState<string>('ALL');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);

  const queryParams = React.useMemo(() => {
    return {
      page,
      limit: 30,
      ...(selectedDay !== 'ALL' && { dayOfWeek: selectedDay as DayOfWeek }),
      sortBy: 'startTime' as const,
      sortOrder: 'asc' as const,
    };
  }, [page, selectedDay]);

  const { data, isLoading, isError, error, refetch, isFetching } = useTimetables(queryParams);

  const items = React.useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.pagination.total ?? 0;

  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.dayOfWeek.toLowerCase().includes(q) ||
        item.startTime.toLowerCase().includes(q) ||
        item.endTime.toLowerCase().includes(q) ||
        item.roomId.toLowerCase().includes(q) ||
        item.facultyAssignmentId.toLowerCase().includes(q) ||
        item.subjectOfferingId.toLowerCase().includes(q),
    );
  }, [items, search]);

  const activeCount = items.filter((item) => !item.isCancelled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Timetable"
        description="Master timetable schedule across degree programs, academic terms, and institutional lecture halls."
        badge="Academic Operations"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </Button>
            <PermissionGuard require="timetable:create">
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={() => {
                  window.location.href = '/app/faculty-assignments';
                }}
              >
                <Plus className="size-3.5" />
                <span>Assign & Schedule</span>
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Total Scheduled Slots
            </span>
            <Calendar className="text-primary size-4" />
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-3">
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground font-mono text-2xl font-bold">{total}</div>
            )}
            <p className="text-muted-foreground mt-0.5 text-[11px]">Active semester allocations</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Active Classes
            </span>
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-3">
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground font-mono text-2xl font-bold">{activeCount}</div>
            )}
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Uncancelled instructional sessions
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Instructional Days
            </span>
            <Clock className="size-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-3">
            <div className="text-foreground font-mono text-2xl font-bold">6 Days</div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">Mon – Sat weekly cycle</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Schedule Authority
            </span>
            <Building2 className="size-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-3">
            <div className="text-foreground font-mono text-2xl font-bold">Institution</div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">Central ERP coordination</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Schedule Matrix Card */}
      <Card className="border-border/80 shadow-2xs">
        <CardHeader className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-heading text-lg">Weekly Schedule Matrix</CardTitle>
            <CardDescription>
              Time slot allocations, room reservations, and faculty assignments across campus
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search slot or ID..."
                className="border-border bg-background placeholder:text-muted-foreground focus:ring-ring h-8 w-full border py-1 pr-3 pl-8 text-xs focus:ring-1 focus:outline-hidden"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Day of Week Tabs */}
          <div className="border-border flex flex-wrap gap-1 border-b pb-3">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.key}
                onClick={() => {
                  setSelectedDay(day.key);
                  setPage(1);
                }}
                className={`px-3 py-1.5 font-mono text-xs transition-colors ${
                  selectedDay === day.key
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3 py-6">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : isError ? (
            <Alert variant="destructive" className="rounded-none">
              <AlertCircle className="size-4" />
              <AlertTitle>Failed to load timetable</AlertTitle>
              <AlertDescription className="mt-1 flex items-center justify-between text-xs">
                <span>{error?.message || 'Could not retrieve timetable entries from server.'}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                  className="h-7 text-xs"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : filteredItems.length === 0 ? (
            <div className="border-border bg-muted/10 text-muted-foreground space-y-2 border p-12 text-center text-xs">
              <Calendar className="text-muted-foreground/50 mx-auto size-8" />
              <p className="font-semibold">No timetable entries scheduled</p>
              <p>
                {selectedDay === 'ALL'
                  ? 'No instructional sessions scheduled for this academic term yet.'
                  : `No class sessions scheduled for ${selectedDay}.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((slot) => (
                <div
                  key={slot.id}
                  className="border-border/80 bg-card hover:bg-muted/20 flex flex-col justify-between border p-3.5 shadow-2xs transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-[10px] font-semibold">
                        {slot.dayOfWeek}
                      </Badge>
                      <Badge
                        variant={slot.isCancelled ? 'destructive' : 'secondary'}
                        className="font-mono text-[10px]"
                      >
                        {slot.isCancelled ? 'Cancelled' : 'Active'}
                      </Badge>
                    </div>

                    <div className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                      <Clock className="text-primary size-3.5" />
                      <span className="font-mono">
                        {slot.startTime} – {slot.endTime}
                      </span>
                    </div>

                    <div className="border-border bg-muted/30 space-y-1.5 border p-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Offering ID:</span>
                        <span className="max-w-[120px] truncate font-mono">
                          {slot.subjectOfferingId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Assignment:</span>
                        <span className="max-w-[120px] truncate font-mono">
                          {slot.facultyAssignmentId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Room ID:</span>
                        <span className="max-w-[120px] truncate font-mono">{slot.roomId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-border text-muted-foreground mt-3 border-t pt-2 text-[10px]">
                    <span>Effective: {new Date(slot.effectiveFrom).toLocaleDateString()}</span>
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
