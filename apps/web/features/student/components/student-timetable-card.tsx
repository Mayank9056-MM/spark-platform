'use client';

import { ArrowUpRight, Calendar, Clock, MapPin, User } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { StudentTimetableEntry } from '../schemas/student.schema';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DAYS = [
  { key: 'MONDAY', label: 'Mon' },
  { key: 'TUESDAY', label: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wed' },
  { key: 'THURSDAY', label: 'Thu' },
  { key: 'FRIDAY', label: 'Fri' },
  { key: 'SATURDAY', label: 'Sat' },
] as const;

function getTodayDayKey(): string {
  const dayIndex = new Date().getDay();
  switch (dayIndex) {
    case 1:
      return 'MONDAY';
    case 2:
      return 'TUESDAY';
    case 3:
      return 'WEDNESDAY';
    case 4:
      return 'THURSDAY';
    case 5:
      return 'FRIDAY';
    case 6:
      return 'SATURDAY';
    default:
      return 'MONDAY';
  }
}

interface StudentTimetableCardProps {
  entries: StudentTimetableEntry[];
  compact?: boolean;
}

export function StudentTimetableCard({ entries, compact = false }: StudentTimetableCardProps) {
  const [selectedDay, setSelectedDay] = useState<string>(getTodayDayKey());

  const dayEntries = useMemo(() => {
    return entries
      .filter((e) => e.dayOfWeek === selectedDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [entries, selectedDay]);

  return (
    <Card className="border-border rounded-none">
      <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Clock className="text-primary size-4" />
            Class Schedule
          </CardTitle>
          <CardDescription>Scheduled lectures and laboratory sessions</CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {compact && (
            <Link
              href="/app/student/timetable"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              View Full
              <ArrowUpRight className="ml-1 size-3.5" />
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
          <TabsList className="grid w-full grid-cols-6 rounded-none">
            {DAYS.map((day) => (
              <TabsTrigger
                key={day.key}
                value={day.key}
                className="rounded-none text-xs data-[state=active]:font-semibold"
              >
                {day.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {dayEntries.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center rounded-none border border-dashed py-8 text-center">
            <Calendar className="text-muted-foreground/50 size-8" />
            <p className="text-foreground mt-2 text-sm font-medium">No sessions scheduled</p>
            <p className="text-muted-foreground text-xs">
              No classes or labs are scheduled for {selectedDay.toLowerCase()}.
            </p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {dayEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground font-mono text-sm font-semibold">
                      {entry.subjectCode}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">
                      {entry.componentType}
                    </Badge>
                  </div>
                  <p className="text-foreground text-sm font-medium">{entry.subjectName}</p>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <div className="flex items-center gap-1">
                      <User className="size-3.5" />
                      <span>{entry.facultyName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      <span>{entry.roomName}</span>
                    </div>
                  </div>
                </div>

                <div className="text-muted-foreground flex items-center gap-1.5 font-mono text-sm font-medium sm:text-right">
                  <Clock className="size-3.5 shrink-0 sm:hidden" />
                  <span>
                    {entry.startTime} – {entry.endTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
