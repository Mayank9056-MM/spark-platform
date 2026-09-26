import { Clock, MapPin, Plus, User } from 'lucide-react';
import { useState } from 'react';

import type { HodTimetableEntry } from '../schemas/hod.schema';
import { CreateHodTimetableDialog } from './create-hod-timetable-dialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DAYS_OF_WEEK = [
  { key: 'ALL', label: 'All Days' },
  { key: 'MONDAY', label: 'Monday' },
  { key: 'TUESDAY', label: 'Tuesday' },
  { key: 'WEDNESDAY', label: 'Wednesday' },
  { key: 'THURSDAY', label: 'Thursday' },
  { key: 'FRIDAY', label: 'Friday' },
  { key: 'SATURDAY', label: 'Saturday' },
];

interface HodTimetableTabProps {
  timetable: HodTimetableEntry[];
  isLoading: boolean;
  selectedDay: string;
  onSelectDay: (day: string) => void;
}

export function HodTimetableTab({
  timetable,
  isLoading,
  selectedDay,
  onSelectDay,
}: HodTimetableTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredEntries =
    selectedDay === 'ALL'
      ? timetable
      : timetable.filter((entry) => entry.dayOfWeek === selectedDay);

  return (
    <>
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div>
            <CardTitle className="font-heading text-lg">Department Timetable Matrix</CardTitle>
            <CardDescription>
              Scheduled instructional sessions across departmental faculty, rooms, and academic cohorts
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 rounded-none font-mono text-xs shrink-0"
          >
            <Plus className="size-3.5" />
            <span>Schedule Class</span>
          </Button>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Day of Week Selector */}
        <div className="border-border flex flex-wrap gap-1 border-b pb-3">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day.key}
              onClick={() => onSelectDay(day.key)}
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

        {/* Timetable List / Grid */}
        {isLoading ? (
          <div className="text-muted-foreground py-12 text-center font-mono text-sm">
            Loading department timetable schedule...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            No timetable entries scheduled for {selectedDay === 'ALL' ? 'the department' : selectedDay}.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="border-border bg-card hover:bg-muted/20 flex flex-col justify-between border p-4 transition-colors"
              >
                <div className="space-y-3">
                  {/* Header: Day and Time */}
                  <div className="flex items-center justify-between">
                    <span className="bg-primary/10 text-primary font-mono text-xs font-bold px-2 py-0.5">
                      {entry.dayOfWeek}
                    </span>
                    <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>
                        {entry.startTime} - {entry.endTime}
                      </span>
                    </div>
                  </div>

                  {/* Subject and Component */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {entry.subject.code}
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {entry.componentType}
                      </Badge>
                    </div>
                    <h4 className="font-heading text-sm font-semibold text-foreground leading-snug">
                      {entry.subject.name}
                    </h4>
                  </div>
                </div>

                {/* Footer: Faculty, Room, Program */}
                <div className="border-border text-muted-foreground mt-4 space-y-1.5 border-t pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {entry.faculty.firstName} {entry.faculty.lastName}
                    </span>
                    <span className="bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                      {entry.program.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <MapPin className="size-3" />
                    <span>
                      {entry.room.name} ({entry.room.type})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <CreateHodTimetableDialog
      isOpen={isCreateOpen}
      onClose={() => setIsCreateOpen(false)}
    />
  </>
  );
}
