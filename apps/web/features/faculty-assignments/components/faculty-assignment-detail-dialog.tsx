'use client';

import { AlertCircleIcon, IdCardIcon } from 'lucide-react';
import * as React from 'react';

import { useFacultyAssignment } from '../hooks/use-faculty-assignment';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/formatters';

interface FacultyAssignmentDetailDialogProps {
  assignmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FacultyAssignmentDetailDialog({
  assignmentId,
  open,
  onOpenChange,
}: FacultyAssignmentDetailDialogProps) {
  const {
    data: assignment,
    isLoading,
    isError,
    error,
    refetch,
  } = useFacultyAssignment(assignmentId ?? '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <IdCardIcon className="text-primary size-4" />
            <span>Faculty Assignment Record</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Teaching allocation parameters and authoritative resource binding.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : isError || !assignment ? (
          <div className="space-y-3 py-4 text-center">
            <AlertCircleIcon className="text-destructive mx-auto size-8" />
            <p className="text-foreground text-xs font-semibold">
              Unable to load assignment details
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {error?.message ??
                'You may not have authorization to view this assignment under department scope rules.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                void refetch();
              }}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-3 py-2 text-xs">
            <div className="bg-muted/30 border-border/60 rounded-md border p-3">
              <span className="text-muted-foreground block text-[10px] font-semibold tracking-wider uppercase">
                Assignment ID
              </span>
              <code className="text-foreground mt-0.5 block font-mono text-[11px] break-all select-all">
                {assignment.id}
              </code>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="bg-muted/20 border-border/60 rounded-md border p-2.5">
                <span className="text-muted-foreground block text-[10px] font-semibold tracking-wider uppercase">
                  Subject Offering ID
                </span>
                <code className="text-foreground mt-0.5 block font-mono text-[11px] break-all select-all">
                  {assignment.subjectOfferingId}
                </code>
              </div>

              <div className="bg-muted/20 border-border/60 rounded-md border p-2.5">
                <span className="text-muted-foreground block text-[10px] font-semibold tracking-wider uppercase">
                  Subject Component ID
                </span>
                <code className="text-foreground mt-0.5 block font-mono text-[11px] break-all select-all">
                  {assignment.subjectComponentId}
                </code>
              </div>
            </div>

            <div className="bg-muted/20 border-border/60 rounded-md border p-2.5">
              <span className="text-muted-foreground block text-[10px] font-semibold tracking-wider uppercase">
                Faculty User ID
              </span>
              <code className="text-foreground mt-0.5 block font-mono text-[11px] break-all select-all">
                {assignment.facultyUserId}
              </code>
            </div>

            <div className="text-muted-foreground grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="font-medium">Created:</span>{' '}
                <span className="font-mono">{formatDateTime(assignment.createdAt)}</span>
              </div>
              <div>
                <span className="font-medium">Last Modified:</span>{' '}
                <span className="font-mono">{formatDateTime(assignment.updatedAt)}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
