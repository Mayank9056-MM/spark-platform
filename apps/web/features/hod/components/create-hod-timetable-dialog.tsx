import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  MapPin,
  Search,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useCreateHodTimetableEntry, useHodTimetableOptions } from '../hooks/use-hod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DAYS_OF_WEEK = [
  { key: 'MONDAY', label: 'Monday' },
  { key: 'TUESDAY', label: 'Tuesday' },
  { key: 'WEDNESDAY', label: 'Wednesday' },
  { key: 'THURSDAY', label: 'Thursday' },
  { key: 'FRIDAY', label: 'Friday' },
  { key: 'SATURDAY', label: 'Saturday' },
] as const;

type DayKey = (typeof DAYS_OF_WEEK)[number]['key'];

interface CreateHodTimetableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFacultyAssignmentId?: string | null;
}

export function CreateHodTimetableDialog({
  isOpen,
  onClose,
  defaultFacultyAssignmentId,
}: CreateHodTimetableDialogProps) {
  const [facultyAssignmentId, setFacultyAssignmentId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayKey>('MONDAY');
  const [timeSlotId, setTimeSlotId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    () => new Date().toISOString().split('T')[0]!,
  );
  const [effectiveTo, setEffectiveTo] = useState('');
  const [assignmentSearch, setAssignmentSearch] = useState('');

  const { data: options, isLoading, isError } = useHodTimetableOptions(isOpen);
  const createTimetable = useCreateHodTimetableEntry();

  useEffect(() => {
    if (isOpen) {
      if (defaultFacultyAssignmentId) {
        setFacultyAssignmentId(defaultFacultyAssignmentId);
      }
    } else {
      setFacultyAssignmentId('');
      setRoomId('');
      setTimeSlotId('');
      setAssignmentSearch('');
      setEffectiveTo('');
    }
  }, [isOpen, defaultFacultyAssignmentId]);

  // When dayOfWeek changes, reset timeSlotId if the selected slot is not for the new day
  const availableSlotsForDay = useMemo(() => {
    if (!options?.timeSlots) return [];
    return options.timeSlots.filter((slot) => slot.dayOfWeek === dayOfWeek);
  }, [options?.timeSlots, dayOfWeek]);

  useEffect(() => {
    if (timeSlotId && availableSlotsForDay.length > 0) {
      const isSlotValid = availableSlotsForDay.some((s) => s.id === timeSlotId);
      if (!isSlotValid) {
        setTimeSlotId('');
      }
    }
  }, [dayOfWeek, availableSlotsForDay, timeSlotId]);

  const selectedAssignment = useMemo(() => {
    if (!options?.facultyAssignments) return undefined;
    return options.facultyAssignments.find((fa) => fa.id === facultyAssignmentId);
  }, [options?.facultyAssignments, facultyAssignmentId]);

  const selectedRoom = useMemo(() => {
    if (!options?.rooms) return undefined;
    return options.rooms.find((r) => r.id === roomId);
  }, [options?.rooms, roomId]);

  const selectedTimeSlot = useMemo(() => {
    if (!options?.timeSlots) return undefined;
    return options.timeSlots.find((s) => s.id === timeSlotId);
  }, [options?.timeSlots, timeSlotId]);

  const filteredAssignments = useMemo(() => {
    if (!options?.facultyAssignments) return [];
    if (!assignmentSearch.trim()) return options.facultyAssignments;
    const query = assignmentSearch.toLowerCase();
    return options.facultyAssignments.filter(
      (fa) =>
        fa.subject.code.toLowerCase().includes(query) ||
        fa.subject.name.toLowerCase().includes(query) ||
        fa.faculty.name.toLowerCase().includes(query) ||
        fa.program.code.toLowerCase().includes(query) ||
        fa.component.type.toLowerCase().includes(query),
    );
  }, [options?.facultyAssignments, assignmentSearch]);

  const isValid = Boolean(
    facultyAssignmentId &&
      roomId &&
      timeSlotId &&
      dayOfWeek &&
      effectiveFrom &&
      /^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    await createTimetable.mutateAsync({
      facultyAssignmentId,
      roomId,
      timeSlotId,
      dayOfWeek,
      effectiveFrom,
      ...(effectiveTo ? { effectiveTo } : {}),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
      <Card className="border-border bg-card relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-none border shadow-2xl">
        <button
          onClick={onClose}
          disabled={createTimetable.isPending}
          className="text-muted-foreground hover:text-foreground absolute top-4 right-4 z-10 p-1.5 transition-colors"
          aria-label="Close dialog"
        >
          <X className="size-5" />
        </button>

        <CardHeader className="border-border border-b pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-primary">
            <Calendar className="size-4" />
            <span>Academic Schedule Allocation</span>
          </div>
          <CardTitle className="font-heading text-xl font-bold">
            Schedule Class Timetable Slot
          </CardTitle>
          <CardDescription>
            Allocate weekly timetable slots for departmental faculty assignments and institutional rooms.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-5">
            {isLoading ? (
              <div className="text-muted-foreground flex h-48 flex-col items-center justify-center gap-2 text-sm">
                <Clock className="size-6 animate-spin text-primary" />
                <span>Loading available courses, faculty assignments, and rooms…</span>
              </div>
            ) : isError ? (
              <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-3 border p-4 text-sm">
                <AlertCircle className="size-5 shrink-0" />
                <span>Could not load scheduling options. Please verify network connection or reload.</span>
              </div>
            ) : (
              <>
                {/* 1. Course & Faculty Assignment Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                      <BookOpen className="size-3.5 text-primary" />
                      1. Select Faculty Instructional Component
                      <span className="text-destructive">*</span>
                    </label>
                    {options?.facultyAssignments && (
                      <span className="text-muted-foreground text-xs font-mono">
                        {options.facultyAssignments.length} components available
                      </span>
                    )}
                  </div>

                  {options?.facultyAssignments.length === 0 ? (
                    <div className="border-border bg-muted/20 text-muted-foreground border p-4 text-xs">
                      No faculty assignments found in this department. Please create faculty assignments first in the Faculty tab.
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                        <input
                          type="text"
                          value={assignmentSearch}
                          onChange={(e) => setAssignmentSearch(e.target.value)}
                          placeholder="Filter by subject code, name, faculty member, or program..."
                          className="border-border bg-background placeholder:text-muted-foreground focus:ring-ring w-full border py-2 pr-3 pl-9 text-xs focus:ring-1 focus:outline-hidden"
                        />
                      </div>

                      <div className="border-border divide-border max-h-48 overflow-y-auto divide-y border bg-muted/10">
                        {filteredAssignments.map((fa) => {
                          const isSelected = fa.id === facultyAssignmentId;
                          return (
                            <div
                              key={fa.id}
                              onClick={() => setFacultyAssignmentId(fa.id)}
                              className={`flex cursor-pointer items-center justify-between p-3 text-xs transition-colors ${
                                isSelected
                                  ? 'bg-primary/10 border-l-primary border-l-4'
                                  : 'hover:bg-muted/40'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-foreground">
                                    {fa.subject.code}
                                  </span>
                                  <span className="font-medium text-foreground">{fa.subject.name}</span>
                                  <Badge variant="outline" className="font-mono text-[10px]">
                                    {fa.component.type}
                                  </Badge>
                                </div>
                                <div className="text-muted-foreground flex items-center gap-3 text-[11px]">
                                  <span className="flex items-center gap-1">
                                    <User className="size-3" />
                                    {fa.faculty.name}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <GraduationCap className="size-3" />
                                    {fa.program.code} - Sem {fa.semesterNumber}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {fa.component.hoursPerWeek} hrs/wk
                                  </span>
                                </div>
                              </div>

                              {isSelected && (
                                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* 2. Recurrence: Day of Week & Time Slot */}
                <div className="space-y-3">
                  <label className="text-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                    <Clock className="size-3.5 text-primary" />
                    2. Select Day of Week & Time Slot
                    <span className="text-destructive">*</span>
                  </label>

                  {/* Day Pills */}
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                    {DAYS_OF_WEEK.map((d) => (
                      <button
                        type="button"
                        key={d.key}
                        onClick={() => setDayOfWeek(d.key)}
                        className={`border px-2 py-2 text-center font-mono text-xs transition-colors ${
                          dayOfWeek === d.key
                            ? 'border-primary bg-primary text-primary-foreground font-semibold'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted/30'
                        }`}
                      >
                        {d.label.slice(0, 3)}
                      </button>
                    ))}
                  </div>

                  {/* Available Time Slots for Selected Day */}
                  {availableSlotsForDay.length === 0 ? (
                    <div className="border-border text-muted-foreground border border-dashed p-4 text-center text-xs">
                      No time slots configured for {dayOfWeek}. Institutional time slots will be auto-generated.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {availableSlotsForDay.map((slot) => {
                        const isSelected = slot.id === timeSlotId;
                        return (
                          <div
                            key={slot.id}
                            onClick={() => setTimeSlotId(slot.id)}
                            className={`flex cursor-pointer items-center justify-between border p-2.5 text-xs transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary font-bold'
                                : 'border-border bg-card text-muted-foreground hover:bg-muted/20'
                            }`}
                          >
                            <span className="font-mono">{slot.startTime} - {slot.endTime}</span>
                            {isSelected && <CheckCircle2 className="size-3.5 text-primary" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Room Allocation */}
                <div className="space-y-3">
                  <label className="text-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                    <MapPin className="size-3.5 text-primary" />
                    3. Select Classroom / Laboratory
                    <span className="text-destructive">*</span>
                  </label>

                  {options?.rooms.length === 0 ? (
                    <div className="border-border text-muted-foreground border border-dashed p-4 text-center text-xs">
                      No rooms registered.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {options?.rooms.map((room) => {
                        const isSelected = room.id === roomId;
                        return (
                          <div
                            key={room.id}
                            onClick={() => setRoomId(room.id)}
                            className={`flex cursor-pointer flex-col gap-1 border p-2.5 text-xs transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/10 border-l-4'
                                : 'border-border bg-card hover:bg-muted/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground">{room.name}</span>
                              <span className="text-muted-foreground font-mono text-[10px]">
                                {room.capacity} seats
                              </span>
                            </div>
                            <span className="text-muted-foreground font-mono text-[11px]">
                              {room.type}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Effective Calendar Period */}
                <div className="space-y-3">
                  <label className="text-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                    <Calendar className="size-3.5 text-primary" />
                    4. Effective Validity Period
                  </label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-1">
                        Effective From <span className="text-destructive">*</span>
                      </span>
                      <input
                        type="date"
                        value={effectiveFrom}
                        onChange={(e) => setEffectiveFrom(e.target.value)}
                        className="border-border bg-background text-foreground focus:ring-ring w-full border px-3 py-2 text-xs focus:ring-1 focus:outline-hidden"
                        required
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-1">
                        Effective To (Optional / Ongoing if blank)
                      </span>
                      <input
                        type="date"
                        value={effectiveTo}
                        onChange={(e) => setEffectiveTo(e.target.value)}
                        className="border-border bg-background text-foreground focus:ring-ring w-full border px-3 py-2 text-xs focus:ring-1 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Scheduling Summary Preview */}
                {selectedAssignment && selectedTimeSlot && selectedRoom && (
                  <div className="border-primary/30 bg-primary/5 space-y-2 border p-3.5 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                      <CheckCircle2 className="size-4" />
                      <span>Class Schedule Confirmation Summary</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground sm:grid-cols-4">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-foreground">Subject</span>
                        <span>{selectedAssignment.subject.code} ({selectedAssignment.component.type})</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-foreground">Faculty</span>
                        <span>{selectedAssignment.faculty.name}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-foreground">Weekly Slot</span>
                        <span className="font-mono">{dayOfWeek} {selectedTimeSlot.startTime}-{selectedTimeSlot.endTime}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-foreground">Room</span>
                        <span>{selectedRoom.name}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Error Feedback */}
            {createTimetable.isError && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 border p-3 text-xs">
                <AlertCircle className="size-4 shrink-0" />
                <span>
                  {createTimetable.error instanceof Error
                    ? createTimetable.error.message
                    : 'Failed to schedule class timetable entry.'}
                </span>
              </div>
            )}
          </CardContent>

          {/* Footer Actions */}
          <div className="border-border bg-muted/20 flex items-center justify-end gap-2 border-t p-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={createTimetable.isPending}
              className="rounded-none text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isValid || createTimetable.isPending}
              className="gap-1.5 rounded-none text-xs"
            >
              {createTimetable.isPending ? (
                <>
                  <Clock className="size-3.5 animate-spin" />
                  <span>Scheduling Class…</span>
                </>
              ) : (
                <>
                  <Calendar className="size-3.5" />
                  <span>Schedule Class</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
