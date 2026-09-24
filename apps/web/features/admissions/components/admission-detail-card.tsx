'use client';

import {
  ArrowLeftIcon,
  BanIcon,
  CheckCircle2Icon,
  CopyIcon,
  Edit3Icon,
  FileTextIcon,
  GraduationCapIcon,
  Loader2Icon,
  SaveIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { useCancelAdmission } from '../hooks/use-cancel-admission';
import { useUpdateAdmission } from '../hooks/use-update-admission';
import { ADMISSION_QUOTAS, type Admission, type AdmissionQuota } from '../schemas/admission.schema';

import { AdmissionStatusBadge } from './admission-status-badge';

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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useProgram } from '@/features/academics/hooks/use-program';
import { useUser } from '@/features/users/hooks/use-user';
import { formatDate, formatDateTime } from '@/lib/formatters';

interface AdmissionDetailCardProps {
  admission: Admission;
}

export function AdmissionDetailCard({ admission }: AdmissionDetailCardProps) {
  const [copied, setCopied] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  const [editDate, setEditDate] = React.useState(admission.admissionDate);
  const [editQuota, setEditQuota] = React.useState<AdmissionQuota>(admission.quota);

  const { data: studentUser } = useUser(admission.userId);
  const { data: program } = useProgram(admission.initialProgramId);

  const cancelMutation = useCancelAdmission();
  const updateMutation = useUpdateAdmission(admission.id);

  const isCancelled = admission.status === 'CANCELLED';

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(admission.admissionNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.add({
        title: 'Copied',
        description: 'Admission number copied to clipboard.',
        type: 'info',
      });
    } catch {
      // ignore
    }
  };

  const handleCancel = () => {
    cancelMutation.mutate(admission.id, {
      onSuccess: () => {
        toast.add({
          title: 'Admission cancelled',
          description: `Admission ${admission.admissionNumber} has been permanently cancelled.`,
          type: 'success',
        });
      },
      onError: (err) => {
        toast.add({
          title: 'Cancellation failed',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  const handleUpdate = () => {
    updateMutation.mutate(
      {
        admissionDate: editDate,
        quota: editQuota,
      },
      {
        onSuccess: () => {
          toast.add({
            title: 'Admission updated',
            description: 'Updated admission registration parameters.',
            type: 'success',
          });
          setEditDialogOpen(false);
        },
        onError: (err) => {
          toast.add({
            title: 'Update failed',
            description: err.message,
            type: 'error',
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Dynamics 365 BC Action Bar */}
      <div className="border-border/60 flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            render={<Link href="/app/admissions" />}
          >
            <ArrowLeftIcon className="size-3.5" />
            <span>Admissions</span>
          </Button>
          <div className="bg-border h-4 w-px" />
          <h1 className="text-foreground max-w-md truncate font-mono text-base font-semibold tracking-tight">
            {admission.admissionNumber}
          </h1>
          <AdmissionStatusBadge status={admission.status} />
        </div>

        <div className="flex items-center gap-2">
          {!isCancelled && (
            <>
              <PermissionGuard require="admission:update">
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogTrigger className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-semibold shadow-2xs">
                    <Edit3Icon className="size-3.5" />
                    <span>Edit Parameters</span>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-semibold">
                        Edit Admission Parameters
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Update official admission date or allocated quota category for{' '}
                        {admission.admissionNumber}.
                      </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="gap-4 py-2">
                      <Field>
                        <FieldLabel className="text-xs font-medium">Admission Date</FieldLabel>
                        <Input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="h-9 font-mono text-xs"
                          disabled={updateMutation.isPending}
                        />
                      </Field>

                      <Field>
                        <FieldLabel className="text-xs font-medium">Allocated Quota</FieldLabel>
                        <Select
                          value={editQuota}
                          onValueChange={(val) => {
                            if (val) setEditQuota(val);
                          }}
                          disabled={updateMutation.isPending}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select quota..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ADMISSION_QUOTAS.map((quota) => (
                              <SelectItem key={quota} value={quota} className="text-xs">
                                {quota.replace(/_/g, ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </FieldGroup>

                    <DialogFooter className="gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setEditDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs font-semibold"
                        onClick={handleUpdate}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (
                          <Loader2Icon className="size-3.5 animate-spin" />
                        ) : (
                          <SaveIcon className="size-3.5" />
                        )}
                        <span>Save Changes</span>
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </PermissionGuard>

              <PermissionGuard require="admission:cancel">
                <AlertDialog>
                  <AlertDialogTrigger className="bg-background inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-rose-500/30 px-3 text-xs font-semibold text-rose-600 shadow-2xs hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20">
                    <BanIcon className="size-3.5" />
                    <span>Cancel Admission</span>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                        Cancel Admission Record?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground text-xs">
                        This action will mark admission{' '}
                        <strong className="text-foreground font-mono">
                          {admission.admissionNumber}
                        </strong>{' '}
                        as CANCELLED. This operation is strictly permanent and cannot be reversed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-2 gap-2">
                      <AlertDialogCancel size="sm" className="h-8 text-xs">
                        Keep Admission
                      </AlertDialogCancel>
                      <AlertDialogAction
                        size="sm"
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 text-xs"
                        onClick={handleCancel}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </PermissionGuard>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* FastTab 1: Registration Details */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <FileTextIcon className="text-primary size-4" />
              <span>Registration Metadata</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Official institutional admission credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="border-border/40 space-y-3 border-t pt-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                Admission Reg Number
              </span>
              <div className="mt-1 flex items-center gap-2">
                <code className="bg-muted/60 text-foreground rounded px-2 py-1 font-mono text-xs font-bold">
                  {admission.admissionNumber}
                </code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-6 shrink-0"
                  onClick={() => {
                    void copyNumber();
                  }}
                  aria-label="Copy Admission Number"
                >
                  {copied ? (
                    <CheckCircle2Icon className="size-3 text-emerald-600" />
                  ) : (
                    <CopyIcon className="text-muted-foreground size-3" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                Admission Type
              </span>
              <p className="text-foreground mt-0.5 font-medium">{admission.admissionType}</p>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                Allocated Quota
              </span>
              <p className="text-foreground mt-0.5 font-medium">
                {admission.quota.replace(/_/g, ' ')}
              </p>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                Admission Date
              </span>
              <p className="text-muted-foreground mt-0.5 font-mono">
                {formatDate(admission.admissionDate)}
              </p>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                Enrolled On
              </span>
              <p className="text-muted-foreground mt-0.5">{formatDateTime(admission.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        {/* FastTab 2: Candidate & Academic Linkages */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <GraduationCapIcon className="text-primary size-4" />
              <span>Program & Student Linkage</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Linked student identity and enrolled academic program.
            </CardDescription>
          </CardHeader>
          <CardContent className="border-border/40 space-y-3 border-t pt-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                Candidate Account
              </span>
              {studentUser ? (
                <div className="mt-1">
                  <Link
                    href={`/app/users/${studentUser.id}`}
                    className="text-foreground hover:text-primary block font-semibold hover:underline"
                  >
                    {studentUser.fullName}
                  </Link>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {studentUser.email}
                  </span>
                </div>
              ) : (
                <code className="text-muted-foreground mt-1 block font-mono text-xs">
                  {admission.userId}
                </code>
              )}
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                Enrolled Degree Program
              </span>
              {program ? (
                <p className="text-foreground mt-0.5 font-medium">
                  {program.name} ({program.code})
                </p>
              ) : (
                <code className="text-muted-foreground mt-1 block font-mono text-xs">
                  {admission.initialProgramId}
                </code>
              )}
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                Admitting Officer UUID
              </span>
              <code className="text-muted-foreground mt-0.5 block font-mono text-xs">
                {admission.admittedByUserId}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
