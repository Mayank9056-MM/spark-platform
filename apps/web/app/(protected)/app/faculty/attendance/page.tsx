'use client';

import { Calendar, Clock, Filter, Lock, UserCheck } from 'lucide-react';
import { useState } from 'react';

import { RequireRole } from '@/components/auth/require-role';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FacultyAttendanceRosterDialog, useFacultyLectures } from '@/features/faculty';

export default function FacultyAttendancePage() {
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'COMPLETED'>('ALL');

  const { data: lectures = [], isLoading } = useFacultyLectures(
    statusFilter === 'ALL' ? undefined : { status: statusFilter },
  );

  const handleOpenAttendance = (lectureId: string) => {
    setSelectedLectureId(lectureId);
    setIsDialogOpen(true);
  };

  return (
    <RequireRole allow={['faculty', 'hod', 'admin', 'super_admin']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight">
              Attendance Management
            </h1>
            <p className="text-muted-foreground text-sm">
              Record, review, and finalize class attendance records for your assigned lectures.
            </p>
          </div>

          <div className="bg-muted/60 border-border flex items-center gap-1.5 rounded-none border p-1">
            <span className="text-muted-foreground flex items-center gap-1 px-2 text-[11px] font-medium">
              <Filter className="size-3" /> Filter:
            </span>
            {(['ALL', 'SCHEDULED', 'COMPLETED'] as const).map((filter) => (
              <Button
                key={filter}
                variant={statusFilter === filter ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter(filter)}
                className="h-7 rounded-none px-2.5 text-xs"
              >
                {filter === 'ALL' ? 'All Lectures' : filter}
              </Button>
            ))}
          </div>
        </div>

        <Card className="border-border rounded-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-bold">Class Lecture Sessions</CardTitle>
            <CardDescription>
              Dated lecture sessions available for attendance taking and verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground flex h-32 items-center justify-center text-xs">
                Loading lecture records…
              </div>
            ) : lectures.length === 0 ? (
              <div className="border-border flex flex-col items-center justify-center border border-dashed px-4 py-12 text-center">
                <Calendar className="text-muted-foreground mb-2 size-8" />
                <h3 className="font-heading text-sm font-semibold">No Lectures Found</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                  No lecture occurrences found matching your filter criteria. Scheduled lectures
                  will appear here as the academic term progresses.
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
                      className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground font-mono text-xs font-bold">
                            {lecture.scheduledDate}
                          </span>
                          <span className="text-muted-foreground font-mono text-xs">
                            ({lecture.startTime} – {lecture.endTime})
                          </span>
                          <Badge
                            variant="secondary"
                            className="font-mono text-[10px] font-semibold uppercase"
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
                          <span>Room: {lecture.room.name}</span>
                          <span>Semester {lecture.semesterCatalog.number}</span>
                          <span className="font-mono">
                            {isLocked ? (
                              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                <Lock className="size-3" /> Locked (
                                {lecture.attendanceSession?.presentCount}/
                                {lecture.attendanceSession?.totalRecords} present)
                              </span>
                            ) : isOpen ? (
                              <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                                <Clock className="size-3" /> In Progress (
                                {lecture.attendanceSession?.totalRecords} marked)
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Attendance Pending</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant={isLocked ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => handleOpenAttendance(lecture.id)}
                          disabled={lecture.status === 'CANCELLED'}
                          className="rounded-none text-xs"
                        >
                          <UserCheck className="mr-1.5 size-3.5" />
                          {isLocked
                            ? 'View Roster'
                            : hasRecords
                              ? 'Continue Session'
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

        <FacultyAttendanceRosterDialog
          lectureId={selectedLectureId}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      </div>
    </RequireRole>
  );
}
