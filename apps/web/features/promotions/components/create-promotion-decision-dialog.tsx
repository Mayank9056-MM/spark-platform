'use client';

import { Loader2Icon, UserCheckIcon } from 'lucide-react';
import * as React from 'react';

import { useCreatePromotionDecision } from '../hooks/use-create-promotion-decision';
import { createPromotionDecisionSchema, type PromotionOutcome } from '../schemas/promotion.schema';

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

interface CreatePromotionDecisionDialogProps {
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const OUTCOMES: { value: PromotionOutcome; label: string; desc: string }[] = [
  { value: 'PROMOTE', label: 'Promote', desc: 'Advance student to next semester catalog' },
  { value: 'REPEAT', label: 'Repeat', desc: 'Re-enroll student in current semester catalog' },
  { value: 'GRADUATE', label: 'Graduate', desc: 'Complete degree program standing' },
  { value: 'WITHDRAW', label: 'Withdraw', desc: 'Withdraw student from enrollment' },
  { value: 'DISCONTINUE', label: 'Discontinue', desc: 'Terminate enrollment progression' },
];

export function CreatePromotionDecisionDialog({
  batchId,
  open,
  onOpenChange,
  onSuccess,
}: CreatePromotionDecisionDialogProps) {
  const [studentEnrollmentId, setStudentEnrollmentId] = React.useState('');
  const [fromSemesterEnrollmentId, setFromSemesterEnrollmentId] = React.useState('');
  const [outcome, setOutcome] = React.useState<PromotionOutcome>('PROMOTE');
  const [remarks, setRemarks] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);

  const createDecisionMutation = useCreatePromotionDecision(batchId);

  const resetForm = () => {
    setStudentEnrollmentId('');
    setFromSemesterEnrollmentId('');
    setOutcome('PROMOTE');
    setRemarks('');
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

    const validation = createPromotionDecisionSchema.safeParse({
      studentEnrollmentId: studentEnrollmentId.trim(),
      fromSemesterEnrollmentId: fromSemesterEnrollmentId.trim(),
      outcome,
      remarks: remarks.trim() || undefined,
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

    createDecisionMutation.mutate(validation.data, {
      onSuccess: () => {
        toast.add({
          title: 'Decision Recorded',
          description: `Promotion decision (${outcome}) was saved to draft batch.`,
          type: 'success',
        });
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (err) => {
        setFormError(err.message);
        toast.add({
          title: 'Decision Failed',
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
            <UserCheckIcon className="text-primary size-4" />
            <span>Record Promotion Decision</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Evaluate a student&apos;s academic standing in this batch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup className="space-y-3">
            <Field>
              <FieldLabel className="text-xs">Student Enrollment ID</FieldLabel>
              <Input
                placeholder="e.g. 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
                value={studentEnrollmentId}
                onChange={(e) => setStudentEnrollmentId(e.target.value)}
                className="font-mono text-xs"
                required
              />
            </Field>

            <Field>
              <FieldLabel className="text-xs">From Semester Enrollment ID</FieldLabel>
              <Input
                placeholder="Current completed semester enrollment ID..."
                value={fromSemesterEnrollmentId}
                onChange={(e) => setFromSemesterEnrollmentId(e.target.value)}
                className="font-mono text-xs"
                required
              />
            </Field>

            <Field>
              <FieldLabel className="text-xs">Evaluation Outcome</FieldLabel>
              <Select
                value={outcome}
                onValueChange={(val) => {
                  if (val) setOutcome(val);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select outcome..." />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      <span className="font-semibold">{o.label}</span>
                      <span className="text-muted-foreground ml-2 text-[11px]">— {o.desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel className="text-xs">Remarks / Justification (Optional)</FieldLabel>
              <Input
                placeholder="Academic standing notes or promotion rationale..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="text-xs"
                maxLength={500}
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
              disabled={createDecisionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs"
              disabled={createDecisionMutation.isPending}
            >
              {createDecisionMutation.isPending ? (
                <>
                  <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                  Recording...
                </>
              ) : (
                'Save Decision'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
