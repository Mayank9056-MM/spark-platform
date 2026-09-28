'use client';

import { Loader2Icon, PlusIcon } from 'lucide-react';
import * as React from 'react';

import { useCreateSemesterEnrollment } from '../hooks/use-create-semester-enrollment';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useAcademicYears } from '@/features/academics/hooks/use-academic-years';
import { useSemesterCatalogs } from '@/features/academics/hooks/use-semester-catalogs';

interface CreateSemesterEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentEnrollmentId: string;
  curriculumVersionId: string;
  studentRollNumber?: string;
  entrySemesterCatalogId?: string;
}

export function CreateSemesterEnrollmentDialog({
  open,
  onOpenChange,
  studentEnrollmentId,
  curriculumVersionId,
  studentRollNumber,
  entrySemesterCatalogId,
}: CreateSemesterEnrollmentDialogProps) {
  const [academicYearId, setAcademicYearId] = React.useState('');
  const [semesterCatalogId, setSemesterCatalogId] = React.useState('');

  const { data: academicYearsData, isLoading: yearsLoading } = useAcademicYears({ limit: 100 });
  const { data: semestersData, isLoading: semsLoading } = useSemesterCatalogs(
    curriculumVersionId ? { curriculumVersionId, limit: 100 } : undefined,
  );

  const createMutation = useCreateSemesterEnrollment();

  const defaultYearId = React.useMemo(() => {
    return (
      academicYearsData?.items.find((y) => y.isActive)?.id ?? academicYearsData?.items[0]?.id ?? ''
    );
  }, [academicYearsData]);

  const selectedYearId = academicYearId !== '' ? academicYearId : defaultYearId;
  const selectedSemesterCatalogId =
    semesterCatalogId !== '' ? semesterCatalogId : (entrySemesterCatalogId ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYearId || !selectedSemesterCatalogId) {
      toast.add({
        title: 'Selection required',
        description: 'Please select both an academic session and a semester catalog term.',
        type: 'error',
      });
      return;
    }

    createMutation.mutate(
      {
        studentEnrollmentId,
        academicYearId: selectedYearId,
        semesterCatalogId: selectedSemesterCatalogId,
      },
      {
        onSuccess: (created) => {
          toast.add({
            title: 'Semester enrollment created',
            description: `Attempt #${created.attemptNumber} registered with status IN_PROGRESS.`,
            type: 'success',
          });
          onOpenChange(false);
          setAcademicYearId('');
          setSemesterCatalogId('');
        },
        onError: (err) => {
          toast.add({
            title: 'Enrollment failed',
            description: err.message,
            type: 'error',
          });
        },
      },
    );
  };

  const sortedSemesters = React.useMemo(() => {
    if (!semestersData?.items) return [];
    return [...semestersData.items].sort((a, b) => a.number - b.number);
  }, [semestersData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Open Semester Enrollment</DialogTitle>
          <DialogDescription className="text-xs">
            Register a semester attempt for student {studentRollNumber ?? studentEnrollmentId}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <FieldGroup className="space-y-3">
            <Field>
              <FieldLabel className="text-xs font-medium">Academic Session / Year *</FieldLabel>
              <Select
                value={selectedYearId}
                onValueChange={(val) => val && setAcademicYearId(val)}
                disabled={yearsLoading || createMutation.isPending}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select academic year..." />
                </SelectTrigger>
                <SelectContent>
                  {academicYearsData?.items.map((year) => (
                    <SelectItem key={year.id} value={year.id} className="text-xs">
                      {year.label} {year.isActive ? '(Active)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel className="text-xs font-medium">Curriculum Semester *</FieldLabel>
              <Select
                value={selectedSemesterCatalogId}
                onValueChange={(val) => val && setSemesterCatalogId(val)}
                disabled={semsLoading || createMutation.isPending}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select curriculum semester..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedSemesters.map((sem) => (
                    <SelectItem key={sem.id} value={sem.id} className="text-xs">
                      Semester {sem.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <PlusIcon className="size-3.5" />
              )}
              <span>Create Semester Enrollment</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
