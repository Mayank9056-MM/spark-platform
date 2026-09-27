'use client';

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCheckIcon,
  GraduationCapIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react';
import * as React from 'react';

import { useFinalizePromotionBatch } from '../hooks/use-finalize-promotion-batch';
import { usePromotionBatch } from '../hooks/use-promotion-batch';
import { usePromotionDecisions } from '../hooks/use-promotion-decisions';
import type { PromotionDecision } from '../schemas/promotion.schema';

import { CreatePromotionDecisionDialog } from './create-promotion-decision-dialog';
import { PromotionBatchStatusBadge } from './promotion-batch-status-badge';
import { PromotionOutcomeBadge } from './promotion-outcome-badge';

import { PermissionGuard } from '@/components/auth/permission-guard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/formatters';

interface PromotionBatchDetailDialogProps {
  batchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromotionBatchDetailDialog({
  batchId,
  open,
  onOpenChange,
}: PromotionBatchDetailDialogProps) {
  const [createDecisionOpen, setCreateDecisionOpen] = React.useState(false);
  const [finalizeConfirmOpen, setFinalizeConfirmOpen] = React.useState(false);

  const {
    data: batch,
    isLoading: isBatchLoading,
    isError: isBatchError,
    error: batchError,
    refetch: refetchBatch,
  } = usePromotionBatch(batchId ?? '');

  const {
    data: decisionsData,
    isLoading: isDecisionsLoading,
    isError: isDecisionsError,
    error: decisionsError,
    refetch: refetchDecisions,
  } = usePromotionDecisions(batchId ?? '');

  const finalizeMutation = useFinalizePromotionBatch();

  const handleFinalize = () => {
    if (!batchId) return;
    finalizeMutation.mutate(batchId, {
      onSuccess: () => {
        toast.add({
          title: 'Batch Finalized',
          description:
            'The promotion batch was successfully finalized. Student semester enrollments have been created.',
          type: 'success',
        });
        setFinalizeConfirmOpen(false);
      },
      onError: (err) => {
        toast.add({
          title: 'Finalization Failed',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  const isDraft = batch?.status === 'DRAFT';
  const decisions = decisionsData?.items ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
                <GraduationCapIcon className="text-primary size-4" />
                <span>Promotion Batch Details</span>
                {batch && <PromotionBatchStatusBadge status={batch.status} />}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Review progression evaluations and execute semester promotion transitions.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto py-2">
            {isBatchLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : isBatchError || !batch ? (
              <div className="space-y-2 py-6 text-center">
                <AlertCircleIcon className="text-destructive mx-auto size-7" />
                <p className="text-foreground text-xs font-semibold">
                  Failed to load promotion batch
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {batchError?.message ?? 'An unexpected error occurred.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetchBatch()}
                  className="h-7 text-xs"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                {/* Batch Metadata Header */}
                <div className="border-border/60 bg-muted/20 grid grid-cols-2 gap-3 rounded-md border p-3 text-xs sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">
                      Batch ID
                    </span>
                    <code className="text-foreground font-mono text-[11px]">
                      {batch.id.slice(0, 8)}...{batch.id.slice(-4)}
                    </code>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">
                      Semester Catalog
                    </span>
                    <code className="text-foreground font-mono text-[11px]">
                      {batch.semesterCatalogId.slice(0, 8)}...
                    </code>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">
                      Academic Year
                    </span>
                    <code className="text-foreground font-mono text-[11px]">
                      {batch.academicYearId.slice(0, 8)}...
                    </code>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">
                      {batch.status === 'FINALIZED' ? 'Finalized At' : 'Created At'}
                    </span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {formatDateTime(batch.finalizedAt ?? batch.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Decisions Section Header */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-foreground text-xs font-semibold">
                      Student Decisions ({decisions.length})
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void refetchDecisions()}
                      className="h-7 px-2 text-xs"
                    >
                      <RefreshCwIcon className="mr-1 size-3" />
                      Refresh
                    </Button>

                    {isDraft && (
                      <PermissionGuard
                        require="promotion:create"
                        allowRoles={['super_admin', 'admin', 'principal', 'hod']}
                      >
                        <Button
                          size="sm"
                          onClick={() => setCreateDecisionOpen(true)}
                          className="h-7 px-2.5 text-xs"
                        >
                          <PlusIcon className="mr-1 size-3" />
                          Record Decision
                        </Button>
                      </PermissionGuard>
                    )}
                  </div>
                </div>

                {/* Decisions Table */}
                {isDecisionsLoading ? (
                  <div className="space-y-2 py-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : isDecisionsError ? (
                  <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-md border p-3 text-center text-xs">
                    <p className="font-semibold">Failed to load decisions</p>
                    <p className="text-[11px]">{decisionsError?.message}</p>
                  </div>
                ) : decisions.length === 0 ? (
                  <div className="border-border/80 text-muted-foreground rounded-md border border-dashed p-6 text-center text-xs">
                    <p className="text-foreground font-medium">No decisions recorded yet</p>
                    <p className="mt-1 text-[11px]">
                      {isDraft
                        ? 'Record individual student promotion outcomes to evaluate their standing before finalization.'
                        : 'No student decisions were included in this finalized batch.'}
                    </p>
                  </div>
                ) : (
                  <div className="border-border/60 overflow-hidden rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="h-8 text-[11px]">Student Enrollment</TableHead>
                          <TableHead className="h-8 text-[11px]">Outcome</TableHead>
                          <TableHead className="h-8 text-[11px]">From Semester</TableHead>
                          <TableHead className="h-8 text-[11px]">Target Semester</TableHead>
                          <TableHead className="h-8 text-[11px]">Remarks</TableHead>
                          <TableHead className="h-8 text-[11px]">Decided At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {decisions.map((d: PromotionDecision) => (
                          <TableRow key={d.id} className="text-xs">
                            <TableCell className="py-2">
                              <code className="font-mono text-[11px] font-semibold">
                                {d.studentEnrollmentId.slice(0, 8)}...
                              </code>
                            </TableCell>
                            <TableCell className="py-2">
                              <PromotionOutcomeBadge outcome={d.outcome} />
                            </TableCell>
                            <TableCell className="py-2">
                              <code className="text-muted-foreground font-mono text-[11px]">
                                {d.fromSemesterEnrollmentId.slice(0, 8)}...
                              </code>
                            </TableCell>
                            <TableCell className="py-2">
                              {d.toSemesterEnrollmentId ? (
                                <code className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                                  {d.toSemesterEnrollmentId.slice(0, 8)}...
                                </code>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[140px] truncate py-2 text-[11px]">
                              {d.remarks ?? '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground py-2 font-mono text-[11px]">
                              {formatDateTime(d.decidedAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex shrink-0 flex-row items-center justify-between border-t pt-3 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>

            {isDraft && (
              <PermissionGuard
                require="promotion:finalize"
                allowRoles={['super_admin', 'admin', 'principal']}
              >
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                  onClick={() => setFinalizeConfirmOpen(true)}
                  disabled={finalizeMutation.isPending || decisions.length === 0}
                >
                  <CheckCheckIcon className="mr-1.5 size-3.5" />
                  Finalize Promotion Batch
                </Button>
              </PermissionGuard>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Decision Dialog */}
      {batchId && (
        <CreatePromotionDecisionDialog
          batchId={batchId}
          open={createDecisionOpen}
          onOpenChange={setCreateDecisionOpen}
        />
      )}

      {/* Finalize Irreversible Confirmation Dialog */}
      <AlertDialog open={finalizeConfirmOpen} onOpenChange={setFinalizeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangleIcon className="size-5" />
              Finalize Promotion Batch?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs">
              <p>
                <strong>This action is irreversible.</strong> Finalizing will apply all{' '}
                {decisions.length} recorded promotion decisions:
              </p>
              <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-[11px]">
                <li>Students marked PROMOTE will be enrolled into the subsequent semester.</li>
                <li>
                  Students marked REPEAT will be re-enrolled into the current semester catalog.
                </li>
                <li>
                  Students marked GRADUATE, WITHDRAW, or DISCONTINUE will transition standing.
                </li>
              </ul>
              <p className="text-foreground pt-1 font-semibold">
                Are you certain you wish to finalize this batch now?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finalizeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalize}
              disabled={finalizeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {finalizeMutation.isPending ? (
                <>
                  <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                  Finalizing...
                </>
              ) : (
                'Confirm Finalization'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
