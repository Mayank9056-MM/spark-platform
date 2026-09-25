'use client';

import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BanIcon,
  CheckCircle2Icon,
  CopyIcon,
  GraduationCapIcon,
  IdCardIcon,
  LogOutIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { useCancelStudentEnrollment } from '../hooks/use-cancel-student-enrollment';
import { useStudentEnrollment } from '../hooks/use-student-enrollment';
import { useWithdrawStudentEnrollment } from '../hooks/use-withdraw-student-enrollment';

import { StudentStatusBadge } from './student-status-badge';

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useProgram } from '@/features/academics/hooks/use-program';
import { useAdmission } from '@/features/admissions/hooks/use-admission';
import { useUser } from '@/features/users/hooks/use-user';
import { formatDate, formatDateTime } from '@/lib/formatters';

interface StudentProfileViewProps {
  enrollmentId: string;
}

export function StudentProfileView({ enrollmentId }: StudentProfileViewProps) {
  const [copiedId, setCopiedId] = React.useState(false);
  const [withdrawReason, setWithdrawReason] = React.useState('');
  const [cancelReason, setCancelReason] = React.useState('');

  const {
    data: enrollment,
    isLoading: enrollmentLoading,
    isError: enrollmentError,
    error: enrollmentErr,
    refetch,
  } = useStudentEnrollment(enrollmentId);

  const { data: user, isLoading: userLoading } = useUser(enrollment?.userId ?? '');
  const { data: admission } = useAdmission(enrollment?.admissionId ?? '');
  const { data: program } = useProgram(enrollment?.programId ?? '');

  const cancelMutation = useCancelStudentEnrollment(enrollmentId);
  const withdrawMutation = useWithdrawStudentEnrollment(enrollmentId);

  const copyUuid = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.add({
        title: 'Copied to clipboard',
        description: 'UUID copied to clipboard.',
        type: 'info',
      });
    } catch {
      // ignore
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (name[0] ?? 'S').toUpperCase();
  };

  const handleCancelEnrollment = () => {
    if (!cancelReason.trim()) {
      toast.add({
        title: 'Reason required',
        description: 'Please provide an administrative reason to cancel this student enrollment.',
        type: 'error',
      });
      return;
    }

    cancelMutation.mutate(
      { reason: cancelReason.trim() },
      {
        onSuccess: () => {
          toast.add({
            title: 'Enrollment cancelled',
            description: `Student enrollment ${enrollment?.rollNumber} has been permanently cancelled.`,
            type: 'success',
          });
          setCancelReason('');
        },
        onError: (err) => {
          toast.add({
            title: 'Failed to cancel enrollment',
            description: err.message,
            type: 'error',
          });
        },
      },
    );
  };

  const handleWithdrawEnrollment = () => {
    if (!withdrawReason.trim()) {
      toast.add({
        title: 'Reason required',
        description: 'Please provide an administrative reason for student withdrawal.',
        type: 'error',
      });
      return;
    }

    withdrawMutation.mutate(
      { reason: withdrawReason.trim() },
      {
        onSuccess: () => {
          toast.add({
            title: 'Student withdrawn',
            description: `Student ${enrollment?.rollNumber} marked as WITHDRAWN.`,
            type: 'success',
          });
          setWithdrawReason('');
        },
        onError: (err) => {
          toast.add({
            title: 'Failed to record withdrawal',
            description: err.message,
            type: 'error',
          });
        },
      },
    );
  };

  if (enrollmentLoading || userLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-muted h-8 w-48 animate-pulse rounded" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-md" />
          <Skeleton className="h-64 rounded-md lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (enrollmentError || !enrollment) {
    return (
      <div className="space-y-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-6 text-center">
        <AlertTriangleIcon className="mx-auto size-8 text-rose-600" />
        <h3 className="text-foreground text-sm font-semibold">Student Record Unavailable</h3>
        <p className="text-muted-foreground mx-auto max-w-md text-xs">
          {enrollmentErr?.message ??
            'The specified student enrollment record could not be located.'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            void refetch();
          }}
        >
          Retry Retrieval
        </Button>
      </div>
    );
  }

  // Invariant: Backend only allows cancellation and withdrawal on ACTIVE enrollments
  const canModifyStatus = enrollment.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      {/* Action Bar */}
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
          <div className="flex items-center gap-2">
            <span className="text-foreground font-mono text-xs font-bold">
              {enrollment.rollNumber}
            </span>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-foreground max-w-xs truncate text-xs font-semibold">
              {user?.fullName ?? 'Student Profile'}
            </span>
          </div>
          <StudentStatusBadge status={enrollment.status} />
        </div>

        <div className="flex items-center gap-2">
          {canModifyStatus && (
            <>
              <PermissionGuard require="student:update">
                <AlertDialog>
                  <AlertDialogTrigger className="bg-background inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-amber-500/30 px-3 text-xs font-semibold text-amber-700 shadow-2xs hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20">
                    <LogOutIcon className="size-3.5" />
                    <span>Withdraw Student</span>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        Record Student Withdrawal?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground text-xs">
                        This action transitions student{' '}
                        <strong className="text-foreground">{user?.fullName}</strong> (
                        {enrollment.rollNumber}) to WITHDRAWN status.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                      <Field>
                        <FieldLabel className="text-xs font-medium">Withdrawal Reason *</FieldLabel>
                        <Textarea
                          placeholder="State reason for institutional withdrawal..."
                          value={withdrawReason}
                          onChange={(e) => setWithdrawReason(e.target.value)}
                          className="h-20 resize-none text-xs"
                          disabled={withdrawMutation.isPending}
                          required
                        />
                      </Field>
                    </div>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel size="sm" className="h-8 text-xs">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        size="sm"
                        className="h-8 bg-amber-600 text-xs text-white hover:bg-amber-700"
                        onClick={handleWithdrawEnrollment}
                        disabled={!withdrawReason.trim() || withdrawMutation.isPending}
                      >
                        {withdrawMutation.isPending ? 'Processing...' : 'Confirm Withdrawal'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </PermissionGuard>

              <PermissionGuard require="student:cancel">
                <AlertDialog>
                  <AlertDialogTrigger className="bg-background inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-rose-500/30 px-3 text-xs font-semibold text-rose-600 shadow-2xs hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20">
                    <BanIcon className="size-3.5" />
                    <span>Cancel Enrollment</span>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                        Cancel Student Enrollment?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground text-xs">
                        Cancelling enrollment for{' '}
                        <strong className="text-foreground">{user?.fullName}</strong> (
                        {enrollment.rollNumber}) is permanent and marks this academic record as
                        CANCELLED.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                      <Field>
                        <FieldLabel className="text-xs font-medium">
                          Cancellation Reason *
                        </FieldLabel>
                        <Textarea
                          placeholder="State reason for permanent cancellation..."
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="h-20 resize-none text-xs"
                          disabled={cancelMutation.isPending}
                          required
                        />
                      </Field>
                    </div>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel size="sm" className="h-8 text-xs">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        size="sm"
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 text-xs"
                        onClick={handleCancelEnrollment}
                        disabled={!cancelReason.trim() || cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? 'Processing...' : 'Confirm Cancellation'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </PermissionGuard>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* FastTab 1: Identity & User Account */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="border-border size-14 rounded-lg border">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
                  <AvatarFallback className="bg-muted text-muted-foreground rounded-lg text-base font-semibold">
                    {getInitials(user?.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <h2 className="text-foreground truncate text-sm font-semibold">
                    {user?.fullName ?? 'Student Account'}
                  </h2>
                  <p className="text-muted-foreground truncate font-mono text-xs">{user?.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">
                      STUDENT
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="border-border/40 space-y-3 border-t pt-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  User Identifier
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <code className="bg-muted/60 text-foreground rounded px-1.5 py-0.5 font-mono text-[11px] break-all select-all">
                    {enrollment.userId}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-6 shrink-0"
                    onClick={() => {
                      void copyUuid(enrollment.userId);
                    }}
                    aria-label="Copy User UUID"
                  >
                    {copiedId ? (
                      <CheckCircle2Icon className="size-3 text-emerald-600" />
                    ) : (
                      <CopyIcon className="text-muted-foreground size-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Institutional Email
                </span>
                <p className="text-foreground mt-0.5 font-mono">{user?.email}</p>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Account Created
                </span>
                <p className="text-muted-foreground mt-0.5">
                  {user?.createdAt ? formatDateTime(user.createdAt) : '—'}
                </p>
              </div>

              {user?.id && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full gap-1.5 text-xs"
                    render={<Link href={`/app/users/${user.id}`} />}
                  >
                    <IdCardIcon className="size-3.5" />
                    <span>View User Profile & Roles</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FastTab 2: Academic Enrollment & Admission */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-border/40 border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <GraduationCapIcon className="text-primary size-4" />
                <span>Academic Program & Enrollment Identity</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Official program registration and active enrollment parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                    Institutional Roll Number
                  </span>
                  <p className="text-foreground mt-1 font-mono text-sm font-bold">
                    {enrollment.rollNumber}
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                    Enrollment Lifecycle Status
                  </span>
                  <div className="mt-1">
                    <StudentStatusBadge status={enrollment.status} />
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                    Degree / Program
                  </span>
                  <p className="text-foreground mt-1 font-medium">
                    {program ? `${program.name} (${program.code})` : enrollment.programId}
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                    Admission Date
                  </span>
                  <p className="text-muted-foreground mt-1 font-mono">
                    {formatDate(enrollment.admissionDate)}
                  </p>
                </div>
              </div>

              {enrollment.statusReason && (
                <div className="bg-muted/40 border-border/60 rounded-md border p-3">
                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                    Status Reason / Administrative Note
                  </span>
                  <p className="text-foreground mt-1">{enrollment.statusReason}</p>
                  {enrollment.statusChangedAt && (
                    <span className="text-muted-foreground mt-1 block text-[10px]">
                      Recorded on {formatDateTime(enrollment.statusChangedAt)}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admission Connection Card */}
          {admission && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-border/40 flex flex-row items-center justify-between border-b pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheckIcon className="text-primary size-4" />
                    <span>Associated Admission Record</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Admission parameters recorded during institutional intake.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  render={<Link href={`/app/admissions/${admission.id}`} />}
                >
                  View Admission
                </Button>
              </CardHeader>
              <CardContent className="pt-4 text-xs">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                      Admission Number
                    </span>
                    <p className="text-foreground mt-1 font-mono font-bold">
                      {admission.admissionNumber}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                      Quota Allocation
                    </span>
                    <p className="text-foreground mt-1">{admission.quota.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                      Admission Type
                    </span>
                    <Badge variant="outline" className="mt-1 font-mono text-[10px]">
                      {admission.admissionType}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
