'use client';

import { Loader2Icon, PlusIcon } from 'lucide-react';
import * as React from 'react';

import { useCreateFacultyAssignment } from '../hooks/use-create-faculty-assignment';
import { createFacultyAssignmentSchema } from '../schemas/faculty-assignment.schema';

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
import { toast } from '@/components/ui/toast';

interface CreateFacultyAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateFacultyAssignmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateFacultyAssignmentDialogProps) {
  const [subjectOfferingId, setSubjectOfferingId] = React.useState('');
  const [subjectComponentId, setSubjectComponentId] = React.useState('');
  const [facultyUserId, setFacultyUserId] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);

  const createAssignmentMutation = useCreateFacultyAssignment();

  const resetForm = () => {
    setSubjectOfferingId('');
    setSubjectComponentId('');
    setFacultyUserId('');
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

    const validation = createFacultyAssignmentSchema.safeParse({
      subjectOfferingId: subjectOfferingId.trim(),
      subjectComponentId: subjectComponentId.trim(),
      facultyUserId: facultyUserId.trim(),
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

    createAssignmentMutation.mutate(validation.data, {
      onSuccess: () => {
        toast.add({
          title: 'Assignment Created',
          description: 'Faculty assignment was recorded successfully.',
          type: 'success',
        });
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (err) => {
        setFormError(err.message);
        toast.add({
          title: 'Creation Failed',
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
            <span>Create Faculty Assignment</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Allocate a faculty user to an active subject offering component.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup className="space-y-3">
            <Field>
              <FieldLabel className="text-xs">Subject Offering ID</FieldLabel>
              <Input
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                value={subjectOfferingId}
                onChange={(e) => setSubjectOfferingId(e.target.value)}
                className="font-mono text-xs"
                required
                disabled={createAssignmentMutation.isPending}
              />
            </Field>

            <Field>
              <FieldLabel className="text-xs">Subject Component ID</FieldLabel>
              <Input
                placeholder="e.g. 7c9e6679-7425-40de-944b-e07fc1f90ae7"
                value={subjectComponentId}
                onChange={(e) => setSubjectComponentId(e.target.value)}
                className="font-mono text-xs"
                required
                disabled={createAssignmentMutation.isPending}
              />
            </Field>

            <Field>
              <FieldLabel className="text-xs">Faculty User ID</FieldLabel>
              <Input
                placeholder="e.g. b21f1530-9b65-4f36-a19e-e223bfd0607d"
                value={facultyUserId}
                onChange={(e) => setFacultyUserId(e.target.value)}
                className="font-mono text-xs"
                required
                disabled={createAssignmentMutation.isPending}
              />
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
              disabled={createAssignmentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs"
              disabled={createAssignmentMutation.isPending}
            >
              {createAssignmentMutation.isPending ? (
                <>
                  <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Assignment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
