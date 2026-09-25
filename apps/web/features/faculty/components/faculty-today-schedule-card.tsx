import { Calendar, Clock, Lock, MapPin, UserCheck, Users } from 'lucide-react';

import type { FacultyLecture } from '../schemas/faculty.schema';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FacultyTodayScheduleCardProps {
  lectures: FacultyLecture[];
  onSelectLecture: (lectureId: string) => void;
  isLoading?: boolean;
}

export function FacultyTodayScheduleCard({
  lectures,
  onSelectLecture,
  isLoading,
}: FacultyTodayScheduleCardProps) {
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <Card className="border-border rounded-none shadow-sm">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-heading text-lg font-bold">
            Today&apos;s Teaching Schedule
          </CardTitle>
          <CardDescription>Scheduled lectures and direct attendance recording</CardDescription>
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          <Calendar className="size-3.5" />
          <span>{todayFormatted}</span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground flex h-32 items-center justify-center text-xs">
            Loading schedule…
          </div>
        ) : lectures.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center border border-dashed px-4 py-10 text-center">
            <div className="bg-muted text-muted-foreground mb-3 rounded-full p-3">
              <Calendar className="size-6" />
            </div>
            <h3 className="font-heading text-sm font-semibold">No Classes Scheduled Today</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
              You do not have any instructional sessions scheduled for today. Review your weekly
              timetable below to view your upcoming class distribution.
            </p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {lectures.map((lecture) => {
              const isLocked = lecture.attendanceSession?.status === 'LOCKED';
              const isOpen = lecture.attendanceSession?.status === 'OPEN';
              const hasRecords = Boolean(
                lecture.attendanceSession && lecture.attendanceSession.totalRecords > 0,
              );

              return (
                <div
                  key={lecture.id}
                  className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground font-mono text-xs font-bold">
                        {lecture.startTime} – {lecture.endTime}
                      </span>
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px] font-semibold tracking-wider uppercase"
                      >
                        {lecture.component.type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] font-medium ${
                          lecture.status === 'COMPLETED'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : lecture.status === 'CANCELLED'
                              ? 'border-destructive/30 bg-destructive/10 text-destructive'
                              : 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400'
                        }`}
                      >
                        {lecture.status}
                      </Badge>
                    </div>

                    <h4 className="font-heading text-foreground text-sm font-semibold">
                      {lecture.subject.code} — {lecture.subject.name}
                    </h4>

                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        <span>{lecture.room.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="size-3" />
                        <span>Semester {lecture.semesterCatalog.number}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono">
                        {isLocked ? (
                          <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <Lock className="size-3" />
                            Attendance Locked ({lecture.attendanceSession?.presentCount}/
                            {lecture.attendanceSession?.totalRecords} present)
                          </span>
                        ) : isOpen ? (
                          <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                            <Clock className="size-3" />
                            Draft Saved ({lecture.attendanceSession?.totalRecords} marked)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Attendance Pending</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={isLocked ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => onSelectLecture(lecture.id)}
                      disabled={lecture.status === 'CANCELLED'}
                      className="shrink-0 rounded-none"
                    >
                      <UserCheck className="mr-1.5 size-4" />
                      {isLocked
                        ? 'View Roster'
                        : hasRecords
                          ? 'Continue Attendance'
                          : 'Take Attendance'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
