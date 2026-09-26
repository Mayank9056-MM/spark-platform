import { AlertCircle, BookOpen, CheckCircle2, Clock, GraduationCap, Layers, Search, User, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useCreateHodFacultyAssignment, useHodCourseOfferings } from '../hooks/use-hod';
import type { HodFacultyMember } from '../schemas/hod.schema';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CreateFacultyAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  faculty: HodFacultyMember[];
  defaultFacultyUserId?: string | null;
}

export function CreateFacultyAssignmentDialog({
  isOpen,
  onClose,
  faculty,
  defaultFacultyUserId,
}: CreateFacultyAssignmentDialogProps) {
  const [facultyUserId, setFacultyUserId] = useState('');
  const [subjectOfferingId, setSubjectOfferingId] = useState('');
  const [subjectComponentId, setSubjectComponentId] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  const { data: offerings, isLoading: isOfferingsLoading, isError: isOfferingsError } =
    useHodCourseOfferings(isOpen);

  const createAssignment = useCreateHodFacultyAssignment();

  // Synchronize defaultFacultyUserId when dialog opens or prop changes
  useEffect(() => {
    if (isOpen) {
      if (defaultFacultyUserId) {
        setFacultyUserId(defaultFacultyUserId);
      } else if (!facultyUserId && faculty.length > 0) {
        setFacultyUserId('');
      }
    } else {
      setSubjectOfferingId('');
      setSubjectComponentId('');
      setCourseSearch('');
    }
  }, [isOpen, defaultFacultyUserId]);

  // Reset selected component if offering changes
  const handleOfferingChange = (newOfferingId: string) => {
    setSubjectOfferingId(newOfferingId);
    setSubjectComponentId('');
  };

  const selectedFaculty = useMemo(
    () => faculty.find((f) => f.userId === facultyUserId),
    [faculty, facultyUserId],
  );

  const selectedOffering = useMemo(
    () => (offerings ? offerings.find((o) => o.id === subjectOfferingId) : undefined),
    [offerings, subjectOfferingId],
  );

  const selectedComponent = useMemo(
    () =>
      selectedOffering ? selectedOffering.components.find((c) => c.id === subjectComponentId) : undefined,
    [selectedOffering, subjectComponentId],
  );

  const filteredOfferings = useMemo(() => {
    if (!offerings) return [];
    if (!courseSearch.trim()) return offerings;
    const query = courseSearch.toLowerCase();
    return offerings.filter(
      (o) =>
        o.subject.code.toLowerCase().includes(query) ||
        o.subject.name.toLowerCase().includes(query) ||
        o.program.code.toLowerCase().includes(query) ||
        o.program.name.toLowerCase().includes(query),
    );
  }, [offerings, courseSearch]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyUserId || !subjectOfferingId || !subjectComponentId) return;
    if (selectedComponent?.isAssigned) return;

    createAssignment.mutate(
      {
        facultyUserId,
        subjectOfferingId,
        subjectComponentId,
      },
      {
        onSuccess: () => {
          onClose();
          setFacultyUserId('');
          setSubjectOfferingId('');
          setSubjectComponentId('');
          setCourseSearch('');
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <Card className="border-border w-full max-w-xl max-h-[90vh] flex flex-col rounded-none shadow-2xl bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4 shrink-0">
          <div>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" />
              Assign Faculty to Course
            </CardTitle>
            <CardDescription className="text-xs">
              Allocate instructional duties to department faculty without manual IDs
            </CardDescription>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="size-4" />
          </button>
        </CardHeader>

        <CardContent className="overflow-y-auto p-6 space-y-5">
          <form id="faculty-assignment-form" onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Faculty Member Selection */}
            <div className="space-y-1.5">
              <label className="text-foreground text-xs font-semibold flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground" />
                Select Faculty Member
              </label>
              <select
                value={facultyUserId}
                onChange={(e) => setFacultyUserId(e.target.value)}
                required
                className="border-border bg-background focus:ring-primary h-10 w-full rounded-none border px-3 text-xs shadow-sm focus:outline-none focus:ring-1"
              >
                <option value="">Choose a department faculty member...</option>
                {faculty.map((f) => (
                  <option key={f.userId} value={f.userId}>
                    Prof. {f.firstName} {f.lastName} ({f.designation}) — {f.assignmentCount} course
                    {f.assignmentCount === 1 ? '' : 's'} assigned
                  </option>
                ))}
              </select>
              {selectedFaculty && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 pt-0.5">
                  <span>Current load:</span>
                  <Badge variant="outline" className="font-mono text-[10px] py-0">
                    {selectedFaculty.assignmentCount} assigned component
                    {selectedFaculty.assignmentCount === 1 ? '' : 's'}
                  </Badge>
                  <span className="font-mono">{selectedFaculty.email}</span>
                </div>
              )}
            </div>

            {/* 2. Course / Subject Offering Selection */}
            <div className="space-y-2">
              <label className="text-foreground text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="size-3.5 text-muted-foreground" />
                  Select Course / Subject Offering
                </span>
                {offerings && (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {offerings.length} offering{offerings.length === 1 ? '' : 's'} available
                  </span>
                )}
              </label>

              {isOfferingsLoading ? (
                <div className="border-border bg-muted/20 border p-4 text-center text-xs font-mono text-muted-foreground animate-pulse">
                  Loading department course offerings for active academic year...
                </div>
              ) : isOfferingsError ? (
                <div className="border-destructive/30 bg-destructive/10 text-destructive border p-3 text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>Failed to load department course offerings. Please refresh the page.</span>
                </div>
              ) : !offerings || offerings.length === 0 ? (
                <div className="border-border bg-muted/10 border p-4 text-center text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">No active course offerings found.</p>
                  <p className="text-[11px] mt-1">
                    There are no subject offerings configured for your department in the active academic year.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Search filter for offerings */}
                  {offerings.length > 5 && (
                    <div className="relative">
                      <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search by code, subject name, or program..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="border-border bg-background placeholder:text-muted-foreground focus:ring-primary h-8 w-full rounded-none border pl-8 pr-3 text-xs shadow-xs focus:outline-none focus:ring-1"
                      />
                    </div>
                  )}

                  <select
                    value={subjectOfferingId}
                    onChange={(e) => handleOfferingChange(e.target.value)}
                    required
                    className="border-border bg-background focus:ring-primary h-10 w-full rounded-none border px-3 text-xs shadow-sm focus:outline-none focus:ring-1"
                  >
                    <option value="">Select a course to allocate...</option>
                    {filteredOfferings.map((offering) => {
                      const unassignedCount = offering.components.filter((c) => !c.isAssigned).length;
                      const totalComponents = offering.components.length;
                      return (
                        <option key={offering.id} value={offering.id}>
                          [{offering.program.code} • Sem {offering.semesterNumber}] {offering.subject.code} -{' '}
                          {offering.subject.name} ({unassignedCount}/{totalComponents} unassigned)
                        </option>
                      );
                    })}
                  </select>

                  {selectedOffering && (
                    <div className="bg-muted/30 border-border border p-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground">
                          {selectedOffering.subject.code} — {selectedOffering.subject.name}
                        </span>
                        <div className="text-[11px] text-muted-foreground">
                          {selectedOffering.program.name} • Semester {selectedOffering.semesterNumber} • Academic
                          Year {selectedOffering.academicYear.label}
                        </div>
                      </div>
                      <Badge
                        variant={selectedOffering.subject.isElective ? 'secondary' : 'outline'}
                        className="font-mono text-[10px]"
                      >
                        {selectedOffering.subject.isElective ? 'Elective' : 'Core'}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Component Selection */}
            {selectedOffering && (
              <div className="space-y-2">
                <label className="text-foreground text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="size-3.5 text-muted-foreground" />
                    Select Instructional Component
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Select one component to allocate
                  </span>
                </label>

                {selectedOffering.components.length === 0 ? (
                  <div className="border-border bg-muted/20 border p-3 text-xs text-muted-foreground text-center">
                    No components defined for this subject in the curriculum catalog.
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedOffering.components.map((comp) => {
                      const isSelected = subjectComponentId === comp.id;
                      const isAssigned = comp.isAssigned;

                      return (
                        <div
                          key={comp.id}
                          onClick={() => {
                            if (!isAssigned) {
                              setSubjectComponentId(comp.id);
                            }
                          }}
                          className={`relative border p-3 transition-all ${
                            isAssigned
                              ? 'border-border/60 bg-muted/40 opacity-75 cursor-not-allowed'
                              : isSelected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary cursor-pointer'
                                : 'border-border bg-card hover:border-primary/50 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-foreground">
                                  {comp.type}
                                </span>
                                {isAssigned ? (
                                  <Badge
                                    variant="secondary"
                                    className="font-mono text-[9px] bg-muted text-muted-foreground py-0"
                                  >
                                    Allocated
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-[9px] border-emerald-600/40 text-emerald-700 dark:text-emerald-400 py-0"
                                  >
                                    Available
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                                <Clock className="size-3" />
                                <span>
                                  {comp.credits} Credits • {comp.hoursPerWeek} hrs/wk
                                </span>
                              </div>
                            </div>

                            {!isAssigned && (
                              <div
                                className={`size-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-muted-foreground/30'
                                }`}
                              >
                                {isSelected && <CheckCircle2 className="size-3.5 fill-current" />}
                              </div>
                            )}
                          </div>

                          {isAssigned && comp.assignedFaculty && (
                            <div className="mt-2 text-[10px] text-muted-foreground border-t border-border/50 pt-1.5 flex items-center gap-1">
                              <User className="size-2.5" />
                              <span>
                                Assigned to:{' '}
                                <strong className="text-foreground">{comp.assignedFaculty.name}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. Assignment Summary Banner */}
            {selectedFaculty && selectedOffering && selectedComponent && (
              <div className="border-border bg-muted/30 border p-3 text-xs space-y-1.5">
                <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Allocation Summary
                </span>
                <div className="grid gap-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Faculty:</span>
                    <span className="font-bold text-foreground">
                      Prof. {selectedFaculty.firstName} {selectedFaculty.lastName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Course:</span>
                    <span className="font-semibold text-foreground">
                      {selectedOffering.subject.code} ({selectedOffering.subject.name})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Component:</span>
                    <span className="font-bold text-primary">
                      {selectedComponent.type} ({selectedComponent.credits} cr •{' '}
                      {selectedComponent.hoursPerWeek} hrs/wk)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cohort:</span>
                    <span className="text-foreground">
                      {selectedOffering.program.code} - Sem {selectedOffering.semesterNumber}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </CardContent>

        <div className="border-t border-border p-4 bg-muted/10 flex items-center justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-none text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="faculty-assignment-form"
            size="sm"
            disabled={
              !facultyUserId ||
              !subjectOfferingId ||
              !subjectComponentId ||
              selectedComponent?.isAssigned ||
              createAssignment.isPending
            }
            className="rounded-none text-xs gap-1.5"
          >
            {createAssignment.isPending ? 'Allocating...' : 'Confirm Assignment'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
