import { CalendarClock, MapPin, Users } from 'lucide-react';
import { useState } from 'react';

import type { FacultyTimetableEntry } from '../schemas/faculty.schema';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
type DayType = (typeof DAYS)[number];

interface FacultyTimetableCardProps {
  timetable: FacultyTimetableEntry[];
  isLoading?: boolean;
}

export function FacultyTimetableCard({ timetable, isLoading }: FacultyTimetableCardProps) {
  // Default to today's day of week if Monday-Saturday, otherwise MONDAY
  const dayNames: readonly ('SUNDAY' | DayType)[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ] as const;
  const todayDayIndex = new Date().getDay();
  const currentDay = dayNames[todayDayIndex];
  const initialDay: DayType = currentDay && currentDay !== 'SUNDAY' ? currentDay : 'MONDAY';

  const [selectedDay, setSelectedDay] = useState<DayType | 'ALL'>(initialDay);

  const filteredEntries =
    selectedDay === 'ALL'
      ? timetable
      : timetable.filter((entry) => entry.dayOfWeek === selectedDay);

  return (
    <Card className="border-border rounded-none shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-heading text-lg font-bold">
            Weekly Teaching Timetable
          </CardTitle>
          <CardDescription>Recurring weekly lecture schedules and room allocations</CardDescription>
        </div>

        <Tabs
          value={selectedDay}
          onValueChange={(val) => setSelectedDay(val as DayType | 'ALL')}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-muted/60 grid h-auto grid-cols-4 rounded-none p-1 sm:flex sm:flex-row">
            <TabsTrigger value="ALL" className="rounded-none px-2 py-1 text-[11px]">
              All
            </TabsTrigger>
            {DAYS.map((day) => {
              const dayShort = day.substring(0, 3);
              const count = timetable.filter((t) => t.dayOfWeek === day).length;
              return (
                <TabsTrigger
                  key={day}
                  value={day}
                  className="rounded-none px-2 py-1 font-mono text-[11px]"
                >
                  {dayShort}
                  {count > 0 && (
                    <span className="text-muted-foreground ml-1 text-[9px]">({count})</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground flex h-32 items-center justify-center text-xs">
            Loading timetable…
          </div>
        ) : timetable.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center border border-dashed px-4 py-10 text-center">
            <div className="bg-muted text-muted-foreground mb-3 rounded-full p-3">
              <CalendarClock className="size-6" />
            </div>
            <h3 className="font-heading text-sm font-semibold">No Timetable Entries Configured</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
              No weekly recurring timetable entries have been scheduled for your assigned courses
              yet.
            </p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center border border-dashed px-4 py-8 text-center">
            <p className="text-muted-foreground text-xs">
              No classes scheduled for {selectedDay}. Select another day to view schedule.
            </p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground font-mono text-xs font-bold">
                      {entry.startTime} – {entry.endTime}
                    </span>
                    {selectedDay === 'ALL' && (
                      <Badge variant="outline" className="font-mono text-[10px] font-bold">
                        {entry.dayOfWeek}
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px] font-semibold uppercase"
                    >
                      {entry.component.type}
                    </Badge>
                  </div>

                  <h4 className="font-heading text-foreground text-sm font-semibold">
                    {entry.subject.code} — {entry.subject.name}
                  </h4>

                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 text-xs">
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      <span>{entry.room.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="size-3" />
                      <span>Semester {entry.semesterCatalog.number}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-muted-foreground font-mono text-xs">
                    Cap: {entry.room.capacity}
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
