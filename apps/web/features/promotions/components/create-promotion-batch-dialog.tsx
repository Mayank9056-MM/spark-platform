'use client';

import { Loader2Icon, PlusIcon } from 'lucide-react';
import * as React from 'react';

import { useCreatePromotionBatch } from '../hooks/use-create-promotion-batch';
import { createPromotionBatchSchema } from '../schemas/promotion.schema';

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
import { Input } from '@/components/ui/input';
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

interface CreatePromotionBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreatePromotionBatchDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePromotionBatchDialogProps) {
  const [academicYearId, setAcademicYearId] = React.useState('');
  const [semesterCatalogId, setSemesterCatalogId] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);

  const { data: academicYearsData } = useAcademicYears({ limit: 50 }, open);
  const { data: semesterCatalogsData } = useSemesterCatalogs({ limit: 100 }, open);

  const createBatchMutation = useCreatePromotionBatch();

  const resetForm = () => {
    setAcademicYearId('');
    setSemesterCatalogId('');
    setFormError(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = createPromotionBatchSchema.safeParse({
      academicYearId: academicYearId.trim(),
      semesterCatalogId: semesterCatalogId.trim(),
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message ?? 'Invalid parameters';
      setFormError(firstIssue);
      toast.add({
        title: 'Validation Error',
        description: firstIssue,
        type: 'error',
      });
      return;
    }

    createBatchMutation.mutate(validation.data, {
      onSuccess: () => {
        toast.add({
          title: 'Promotion Batch Opened',
          description: 'A new draft promotion batch was created successfully.',
          type: 'success',
        });
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (err) => {
        setFormError(err.message);
        toast.add({
          title: 'Batch Creation Failed',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <PlusIcon className="text-primary size-4" />
            <span>Open Promotion Batch</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Initiate a semester progression batch for student evaluation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup className="space-y-3">
            <Field>
              <FieldLabel className="text-xs">Academic Year</FieldLabel>
              {academicYearsData?.items && academicYearsData.items.length > 0 ? (
                <Select
                  value={academicYearId}
                  onValueChange={(val) => {
                    if (val) setAcademicYearId(val);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select academic year..." />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYearsData.items.map((ay) => (
                      <SelectItem key={ay.id} value={ay.id} className="font-mono text-xs">
                        {ay.label} {ay.isActive ? '(Active)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Enter Academic Year UUID..."
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              )}
            </Field>

            <Field>
              <FieldLabel className="text-xs">Semester Catalog</FieldLabel>
              {semesterCatalogsData?.items && semesterCatalogsData.items.length > 0 ? (
                <Select
                  value={semesterCatalogId}
                  onValueChange={(val) => {
                    if (val) setSemesterCatalogId(val);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select semester catalog..." />
                  </SelectTrigger>
                  <SelectContent>
                    {semesterCatalogsData.items.map((sem) => (
                      <SelectItem key={sem.id} value={sem.id} className="font-mono text-xs">
                        Semester {sem.number} ({sem.id.slice(0, 8)}...)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Enter Semester Catalog UUID..."
                  value={semesterCatalogId}
                  onChange={(e) => setSemesterCatalogId(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              )}
            </Field>
          </FieldGroup>

          {formError && (
            <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-md border p-2.5 text-xs">
              {formError}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleOpenChange(false)}
              disabled={createBatchMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs"
              disabled={createBatchMutation.isPending || !academicYearId || !semesterCatalogId}
            >
              {createBatchMutation.isPending ? (
                <>
                  <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                  Opening...
                </>
              ) : (
                'Open Batch'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
