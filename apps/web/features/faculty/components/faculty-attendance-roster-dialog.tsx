import { AlertCircle, Check, Clock, Lock, Save, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useFacultyLectureRoster, useSubmitFacultyAttendance } from '../hooks/use-faculty';
import type { AttendanceStatus } from '../schemas/faculty.schema';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FacultyAttendanceRosterDialogProps {
  lectureId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FacultyAttendanceRosterDialog({
  lectureId,
  open,
  onOpenChange,
}: FacultyAttendanceRosterDialogProps) {
  const { data: rosterData, isLoading, error } = useFacultyLectureRoster(lectureId);
  const submitMutation = useSubmitFacultyAttendance(lectureId ?? '');

  // Local state for user edits to attendance records
  const [draftAttendance, setDraftAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [activeLectureKey, setActiveLectureKey] = useState<string | null>(null);

  // If lectureId changed, sync state during render
  if (lectureId !== activeLectureKey) {
    setActiveLectureKey(lectureId);
    setDraftAttendance({});
  }

  // Derive effective attendance map: server state overridden by user draft edits
  const effectiveAttendanceMap: Record<string, AttendanceStatus> = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    if (rosterData?.students) {
      for (const student of rosterData.students) {
        if (student.attendanceStatus) {
          map[student.semesterEnrollmentId] = student.attendanceStatus;
        }
      }
    }
    return { ...map, ...draftAttendance };
  }, [rosterData, draftAttendance]);

  if (!lectureId) return null;

  const isLocked = rosterData?.session?.status === 'LOCKED';
  const students = rosterData?.students ?? [];
  const lecture = rosterData?.lecture;

  // Compute live local metrics
  const totalStudents = students.length;
  const markedCount = Object.keys(effectiveAttendanceMap).length;
  const presentCount = Object.values(effectiveAttendanceMap).filter(
    (s) => s === 'PRESENT' || s === 'LATE',
  ).length;
  const absentCount = Object.values(effectiveAttendanceMap).filter((s) => s === 'ABSENT').length;

  const handleSetStatus = (enrollmentId: string, status: AttendanceStatus) => {
    if (isLocked) return;
    setDraftAttendance((prev) => ({
      ...prev,
      [enrollmentId]: status,
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (isLocked) return;
    const newMap: Record<string, AttendanceStatus> = {};
    for (const student of students) {
      newMap[student.semesterEnrollmentId] = status;
    }
    setDraftAttendance(newMap);
  };

  const handleSubmit = (lockSession: boolean) => {
    if (isLocked) return;

    // Build records array
    const records = Object.entries(effectiveAttendanceMap).map(
      ([semesterEnrollmentId, status]) => ({
        semesterEnrollmentId,
        status,
      }),
    );

    if (records.length === 0) {
      return;
    }

    submitMutation.mutate(
      {
        records,
        lockSession,
      },
      {
        onSuccess: () => {
          if (lockSession) {
            onOpenChange(false);
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col rounded-none p-0">
        <DialogHeader className="border-border border-b p-6 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <DialogTitle className="font-heading text-xl font-bold">
                  Class Attendance Roster
                </DialogTitle>
                {isLocked ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 font-mono text-xs text-emerald-600"
                  >
                    <Lock className="mr-1 size-3" /> Locked
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 font-mono text-xs text-amber-600"
                  >
                    <Clock className="mr-1 size-3" /> Open / Editable
                  </Badge>
                )}
              </div>
              {lecture && (
                <DialogDescription className="text-xs">
                  {lecture.subject.code} — {lecture.subject.name} ({lecture.component.type}) ·{' '}
                  {lecture.room.name} · {lecture.scheduledDate} ({lecture.startTime} –{' '}
                  {lecture.endTime})
                </DialogDescription>
              )}
            </div>

            {/* Attendance Status Summary Badges */}
            <div className="bg-muted/50 border-border flex items-center gap-3 border p-2 font-mono text-xs">
              <div>
                <span className="text-muted-foreground">Enrolled: </span>
                <span className="font-bold">{totalStudents}</span>
              </div>
              <div className="border-border border-l pl-3">
                <span className="text-muted-foreground">Marked: </span>
                <span className="font-bold">
                  {markedCount}/{totalStudents}
                </span>
              </div>
              <div className="border-border border-l pl-3 text-emerald-600 dark:text-emerald-400">
                <span>Present: </span>
                <span className="font-bold">{presentCount}</span>
              </div>
              <div className="border-border border-l pl-3 text-rose-600 dark:text-rose-400">
                <span>Absent: </span>
                <span className="font-bold">{absentCount}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {isLocked && (
          <div className="px-6 pt-4">
            <Alert className="rounded-none border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-300">
              <Lock className="size-4 text-emerald-600" />
              <AlertTitle className="text-xs font-semibold">
                Attendance Session Finalized
              </AlertTitle>
              <AlertDescription className="text-muted-foreground text-xs">
                This attendance session has been locked. Attendance records are permanent and in
                read-only audit status.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Batch Actions Bar (when open) */}
        {!isLocked && (
          <div className="bg-muted/30 border-border flex flex-wrap items-center justify-between gap-2 border-b px-6 py-2.5">
            <span className="text-muted-foreground text-xs font-medium">Quick Mark Actions:</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAll('PRESENT')}
                className="h-7 rounded-none text-xs"
              >
                <Check className="mr-1 size-3 text-emerald-500" />
                Mark All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAll('ABSENT')}
                className="h-7 rounded-none text-xs"
              >
                <X className="mr-1 size-3 text-rose-500" />
                Mark All Absent
              </Button>
            </div>
          </div>
        )}

        {/* Roster Table Content */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {isLoading ? (
            <div className="text-muted-foreground flex h-48 items-center justify-center text-xs">
              Loading student roster…
            </div>
          ) : error ? (
            <div className="text-destructive p-4 text-center text-xs">
              Failed to load roster: {error.message}
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="text-muted-foreground mb-2 size-8" />
              <p className="font-heading text-sm font-semibold">No Enrolled Students Found</p>
              <p className="text-muted-foreground mt-1 text-xs">
                There are no active semester enrollments registered for this cohort.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center font-semibold">#</TableHead>
                  <TableHead className="w-32 font-semibold">Roll Number</TableHead>
                  <TableHead className="font-semibold">Student Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="text-right font-semibold">Attendance Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, idx) => {
                  const currentStatus =
                    effectiveAttendanceMap[student.semesterEnrollmentId] ?? null;

                  return (
                    <TableRow key={student.semesterEnrollmentId} className="h-12">
                      <TableCell className="text-muted-foreground text-center font-mono text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="text-foreground font-mono text-xs font-bold">
                        {student.rollNumber}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {student.email}
                      </TableCell>
                      <TableCell className="text-right">
                        {isLocked ? (
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs font-semibold ${
                              currentStatus === 'PRESENT'
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                                : currentStatus === 'ABSENT'
                                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-600'
                                  : currentStatus === 'LATE'
                                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                                    : 'border-muted bg-muted text-muted-foreground'
                            }`}
                          >
                            {currentStatus ?? 'UNMARKED'}
                          </Badge>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={currentStatus === 'PRESENT' ? 'default' : 'outline'}
                              onClick={() =>
                                handleSetStatus(student.semesterEnrollmentId, 'PRESENT')
                              }
                              className={`h-7 rounded-none px-2.5 text-xs ${
                                currentStatus === 'PRESENT'
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950'
                              }`}
                            >
                              Present
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={currentStatus === 'ABSENT' ? 'destructive' : 'outline'}
                              onClick={() =>
                                handleSetStatus(student.semesterEnrollmentId, 'ABSENT')
                              }
                              className={`h-7 rounded-none px-2.5 text-xs ${
                                currentStatus === 'ABSENT'
                                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                                  : 'hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950'
                              }`}
                            >
                              Absent
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={currentStatus === 'LATE' ? 'secondary' : 'outline'}
                              onClick={() => handleSetStatus(student.semesterEnrollmentId, 'LATE')}
                              className={`h-7 rounded-none px-2.5 text-xs ${
                                currentStatus === 'LATE'
                                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                                  : 'hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950'
                              }`}
                            >
                              Late
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="border-border bg-muted/20 flex flex-col items-center justify-between gap-3 border-t p-4 sm:flex-row">
          <div className="text-muted-foreground text-xs">
            {!isLocked && (
              <span>
                {markedCount < totalStudents ? (
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    ⚠️ {totalStudents - markedCount} student(s) unmarked.
                  </span>
                ) : (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    ✓ All {totalStudents} students marked.
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-none text-xs"
            >
              {isLocked ? 'Close' : 'Cancel'}
            </Button>

            {!isLocked && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit(false)}
                  disabled={submitMutation.isPending || markedCount === 0}
                  className="rounded-none text-xs"
                >
                  <Save className="mr-1.5 size-3.5" />
                  {submitMutation.isPending ? 'Saving…' : 'Save Draft'}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSubmit(true)}
                  disabled={submitMutation.isPending || markedCount === 0}
                  className="bg-primary rounded-none text-xs"
                >
                  <Lock className="mr-1.5 size-3.5" />
                  {submitMutation.isPending ? 'Finalizing…' : 'Finalize & Lock'}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
