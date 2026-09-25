'use client';

import {
  ArchiveIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  CopyIcon,
  Edit3Icon,
  GraduationCapIcon,
  KeyRoundIcon,
  PlusIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { useArchiveUser } from '../hooks/use-archive-user';
import { useRestoreUser } from '../hooks/use-restore-user';
import type { UserProfile } from '../schemas/user.schema';

import { UserStatusBadge } from './user-status-badge';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useDepartments } from '@/features/academics/hooks/use-departments';
import type { CreateRoleAssignmentPayload } from '@/features/roles/api/role-assignments';
import { useAssignRole } from '@/features/roles/hooks/use-assign-role';
import { useRevokeRoleAssignment } from '@/features/roles/hooks/use-revoke-role-assignment';
import { useRoles } from '@/features/roles/hooks/use-roles';
import { useUserRoleAssignments } from '@/features/roles/hooks/use-user-role-assignments';
import type { RoleAssignmentItem, RoleItem } from '@/features/roles/schemas/role.schema';
import { formatDate, formatDateTime } from '@/lib/formatters';

interface UserDetailCardProps {
  user: UserProfile;
}

export function UserDetailCard({ user }: UserDetailCardProps) {
  const [copied, setCopied] = React.useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [selectedRoleId, setSelectedRoleId] = React.useState('');
  const [selectedScopeType, setSelectedScopeType] = React.useState<'COLLEGE' | 'DEPARTMENT'>(
    'COLLEGE',
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState('');

  const archiveMutation = useArchiveUser();
  const restoreMutation = useRestoreUser();

  const {
    data: assignmentsData,
    isLoading: assignmentsLoading,
    isError: assignmentsError,
  } = useUserRoleAssignments(user.id);

  const { data: rolesData } = useRoles({ limit: 100 });
  const { data: departmentsData } = useDepartments({ limit: 100 });

  const assignRoleMutation = useAssignRole();
  const revokeRoleMutation = useRevokeRoleAssignment(user.id);

  const isArchived = user.status === 'ARCHIVED';

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.add({
        title: 'User ID copied',
        description: 'Copied user UUID to clipboard.',
        type: 'info',
      });
    } catch {
      // ignore
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (name[0] || 'U').toUpperCase();
  };

  const handleAssignRole = () => {
    if (!selectedRoleId) return;
    if (selectedScopeType === 'DEPARTMENT' && !selectedDepartmentId) {
      toast.add({
        title: 'Department required',
        description: 'Please select an academic department for department-scoped role allocation.',
        type: 'error',
      });
      return;
    }

    const payload: CreateRoleAssignmentPayload =
      selectedScopeType === 'DEPARTMENT'
        ? {
            userId: user.id,
            roleId: selectedRoleId,
            scope: { type: 'DEPARTMENT', departmentId: selectedDepartmentId },
          }
        : {
            userId: user.id,
            roleId: selectedRoleId,
            scope: { type: 'COLLEGE' },
          };

    assignRoleMutation.mutate(payload, {
      onSuccess: () => {
        toast.add({
          title: 'Role granted',
          description: 'Assigned institutional role successfully.',
          type: 'success',
        });
        setAssignDialogOpen(false);
        setSelectedRoleId('');
        setSelectedDepartmentId('');
        setSelectedScopeType('COLLEGE');
      },
      onError: (err) => {
        toast.add({
          title: 'Failed to assign role',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  const handleRevokeRole = (assignmentId: string, roleName: string) => {
    revokeRoleMutation.mutate(assignmentId, {
      onSuccess: () => {
        toast.add({
          title: 'Role revoked',
          description: `Revoked ${roleName} from user.`,
          type: 'success',
        });
      },
      onError: (err) => {
        toast.add({
          title: 'Failed to revoke role',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  // Map roleId to role displayName if available
  const rolesMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (rolesData?.items) {
      for (const r of rolesData.items) {
        map.set(r.id, r.displayName);
      }
    }
    return map;
  }, [rolesData]);

  // Map departmentId to department name if available
  const departmentsMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (departmentsData?.items) {
      for (const d of departmentsData.items) {
        map.set(d.id, `${d.name} (${d.code})`);
      }
    }
    return map;
  }, [departmentsData]);

  const assignments = assignmentsData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Dynamics 365 BC Action Bar */}
      <div className="border-border/60 flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            render={<Link href="/app/users" />}
          >
            <ArrowLeftIcon className="size-3.5" />
            <span>Users</span>
          </Button>
          <div className="bg-border h-4 w-px" />
          <h1 className="text-foreground max-w-md truncate text-base font-semibold tracking-tight">
            {user.fullName}
          </h1>
          <UserStatusBadge status={user.status} />
        </div>

        <div className="flex items-center gap-2">
          <PermissionGuard require="user:update">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              render={<Link href={`/app/users/${user.id}/edit`} />}
            >
              <Edit3Icon className="size-3.5" />
              <span>Edit Profile</span>
            </Button>
          </PermissionGuard>

          {!isArchived && (
            <PermissionGuard require="admission:create">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                render={<Link href={`/app/admissions/new?userId=${user.id}`} />}
              >
                <GraduationCapIcon className="size-3.5" />
                <span>Admit Candidate</span>
              </Button>
            </PermissionGuard>
          )}

          {isArchived ? (
            <PermissionGuard require="user:restore">
              <AlertDialog>
                <AlertDialogTrigger className="bg-background inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-emerald-500/30 px-3 text-xs font-semibold text-emerald-600 shadow-2xs hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/20">
                  <RotateCcwIcon className="size-3.5" />
                  <span>Restore Account</span>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      Restore User Account?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground text-xs">
                      Restoring will reactivate {user.fullName}&apos;s account, restoring access to
                      S.P.A.R.K. with their previously configured permissions.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-2 gap-2">
                    <AlertDialogCancel size="sm" className="h-8 text-xs">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      size="sm"
                      className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                      onClick={() => restoreMutation.mutate(user.id)}
                      disabled={restoreMutation.isPending}
                    >
                      {restoreMutation.isPending ? 'Restoring...' : 'Confirm Restore'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGuard>
          ) : (
            <PermissionGuard require="user:archive">
              <AlertDialog>
                <AlertDialogTrigger className="bg-background inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-rose-500/30 px-3 text-xs font-semibold text-rose-600 shadow-2xs hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20">
                  <ArchiveIcon className="size-3.5" />
                  <span>Archive Account</span>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                      Archive User Account?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground text-xs">
                      Archiving will mark this account as ARCHIVED, immediately preventing{' '}
                      {user.fullName} from logging into S.P.A.R.K. and revoking all active sessions.
                      This action can be reversed at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-2 gap-2">
                    <AlertDialogCancel size="sm" className="h-8 text-xs">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      size="sm"
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 text-xs"
                      onClick={() => archiveMutation.mutate(user.id)}
                      disabled={archiveMutation.isPending}
                    >
                      {archiveMutation.isPending ? 'Archiving...' : 'Confirm Archive'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGuard>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: FastTab 1 - Identity & Profile Summary */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="border-border size-14 rounded-lg border">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
                  <AvatarFallback className="bg-muted text-muted-foreground rounded-lg text-base font-semibold">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <h2 className="text-foreground truncate text-sm font-semibold">
                    {user.fullName}
                  </h2>
                  <p className="text-muted-foreground truncate font-mono text-xs">{user.email}</p>
                  <div className="mt-1">
                    <UserStatusBadge status={user.status} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="border-border/40 space-y-3 border-t pt-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  System Identifier
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <code className="bg-muted/60 text-foreground rounded px-1.5 py-0.5 font-mono text-[11px] break-all select-all">
                    {user.id}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-6 shrink-0"
                    onClick={() => {
                      void copyId();
                    }}
                    aria-label="Copy User UUID"
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
                  First & Last Name
                </span>
                <p className="text-foreground mt-0.5 font-medium">
                  {user.firstName} {user.middleName ? `${user.middleName} ` : ''}
                  {user.lastName}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Primary Institutional Email
                </span>
                <p className="text-foreground mt-0.5 font-mono">{user.email}</p>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Account Created
                </span>
                <p className="text-muted-foreground mt-0.5">{formatDateTime(user.createdAt)}</p>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Last Activity / Login
                </span>
                <p className="text-muted-foreground mt-0.5">
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never logged in'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: FastTab 2 - Role Assignments & Governance */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <KeyRoundIcon className="text-primary size-4" />
                  <span>Assigned Roles & Governance</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Active role assignments determine this user&apos;s operational capabilities across
                  S.P.A.R.K.
                </CardDescription>
              </div>

              <PermissionGuard require="roleAssignment:create">
                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                  <DialogTrigger className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold shadow-xs">
                    <PlusIcon className="size-3.5" />
                    <span>Assign Role</span>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-semibold">
                        Assign Role to User
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Select an institutional role to allocate to {user.fullName}.
                      </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="gap-4 py-2">
                      <Field>
                        <FieldLabel className="text-xs font-medium">Select Role</FieldLabel>
                        <Select
                          value={selectedRoleId}
                          onValueChange={(val) => {
                            if (val) setSelectedRoleId(val);
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Choose a role..." />
                          </SelectTrigger>
                          <SelectContent>
                            {rolesData?.items?.map((role: RoleItem) => (
                              <SelectItem key={role.id} value={role.id} className="text-xs">
                                {role.displayName} ({role.key})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field>
                        <FieldLabel className="text-xs font-medium">Scope Context</FieldLabel>
                        <Select
                          value={selectedScopeType}
                          onValueChange={(val) => {
                            if (val === 'COLLEGE' || val === 'DEPARTMENT') {
                              setSelectedScopeType(val);
                            }
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select scope..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COLLEGE" className="text-xs">
                              College-wide (Institution-level)
                            </SelectItem>
                            <SelectItem value="DEPARTMENT" className="text-xs">
                              Department-specific (Scoped to Department)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      {selectedScopeType === 'DEPARTMENT' && (
                        <Field>
                          <FieldLabel className="text-xs font-medium">
                            Academic Department
                          </FieldLabel>
                          <Select
                            value={selectedDepartmentId}
                            onValueChange={(val) => {
                              if (val) setSelectedDepartmentId(val);
                            }}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Choose department..." />
                            </SelectTrigger>
                            <SelectContent>
                              {departmentsData?.items?.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id} className="text-xs">
                                  {dept.name} ({dept.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    </FieldGroup>

                    <DialogFooter className="gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setAssignDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs font-semibold"
                        onClick={handleAssignRole}
                        disabled={!selectedRoleId || assignRoleMutation.isPending}
                      >
                        {assignRoleMutation.isPending ? 'Allocating...' : 'Allocate Role'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </PermissionGuard>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : assignmentsError ? (
                <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-700 dark:text-rose-400">
                  Failed to load role assignments for this user.
                </div>
              ) : assignments.length === 0 ? (
                <div className="border-border/80 rounded-lg border border-dashed py-8 text-center">
                  <ShieldCheckIcon className="text-muted-foreground/60 mx-auto mb-2 size-8" />
                  <p className="text-foreground text-xs font-semibold">No roles assigned</p>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    This account currently has no active operational roles assigned.
                  </p>
                </div>
              ) : (
                <div className="border-border/80 overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="h-9 text-xs">Role</TableHead>
                        <TableHead className="h-9 text-xs">Scope</TableHead>
                        <TableHead className="h-9 text-xs">Valid From</TableHead>
                        <TableHead className="h-9 text-right text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment: RoleAssignmentItem) => {
                        const roleName =
                          rolesMap.get(assignment.roleId) ?? assignment.role?.displayName ?? 'Role';
                        const isRevoking =
                          revokeRoleMutation.isPending &&
                          revokeRoleMutation.variables === assignment.id;

                        return (
                          <TableRow key={assignment.id}>
                            <TableCell className="text-xs font-medium">
                              <div className="flex items-center gap-1.5">
                                <KeyRoundIcon className="text-muted-foreground size-3.5 shrink-0" />
                                <span>{roleName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {assignment.scope.type === 'DEPARTMENT' ? (
                                <div className="flex flex-col">
                                  <Badge
                                    variant="outline"
                                    className="w-fit border-blue-500/30 bg-blue-500/10 font-mono text-[10px] text-blue-700 dark:text-blue-400"
                                  >
                                    DEPARTMENT
                                  </Badge>
                                  <span className="text-muted-foreground mt-0.5 text-[11px] font-medium">
                                    {departmentsMap.get(assignment.scope.departmentId) ??
                                      assignment.scope.departmentId}
                                  </span>
                                </div>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[10px] uppercase"
                                >
                                  COLLEGE
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground font-mono text-xs">
                              {formatDate(assignment.validFrom)}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <PermissionGuard require="roleAssignment:delete">
                                <AlertDialog>
                                  <AlertDialogTrigger className="inline-flex size-7 cursor-pointer items-center justify-center rounded-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:hover:bg-rose-950/20">
                                    <Trash2Icon className="size-3.5" />
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                                        Revoke Role Assignment?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="text-muted-foreground text-xs">
                                        Are you sure you want to revoke{' '}
                                        <strong className="text-foreground">{roleName}</strong> from{' '}
                                        {user.fullName}? The user will immediately forfeit all
                                        capabilities granted by this role.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-2 gap-2">
                                      <AlertDialogCancel size="sm" className="h-8 text-xs">
                                        Keep Role
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        size="sm"
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 text-xs"
                                        onClick={() => handleRevokeRole(assignment.id, roleName)}
                                        disabled={isRevoking}
                                      >
                                        {isRevoking ? 'Revoking...' : 'Confirm Revocation'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </PermissionGuard>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
