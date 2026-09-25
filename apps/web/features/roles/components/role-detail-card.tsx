'use client';

import {
  ArrowLeftIcon,
  Edit3Icon,
  KeyRoundIcon,
  LockIcon,
  PlusIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { useGrantPermission } from '../hooks/use-grant-permission';
import { useRevokePermission } from '../hooks/use-revoke-permission';
import { useRolePermissions } from '../hooks/use-role-permissions';
import type { RoleItem } from '../schemas/role.schema';

import { PermissionGuard } from '@/components/auth/permission-guard';
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
import { Input } from '@/components/ui/input';
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
import { usePermissions } from '@/features/permissions/hooks/use-permissions';
import { formatDateTime } from '@/lib/formatters';

interface RoleDetailCardProps {
  role: RoleItem;
}

export function RoleDetailCard({ role }: RoleDetailCardProps) {
  const [permissionSearch, setPermissionSearch] = React.useState('');
  const [grantDialogOpen, setGrantDialogOpen] = React.useState(false);
  const [catalogSearch, setCatalogSearch] = React.useState('');

  const {
    data: rolePermData,
    isLoading: permsLoading,
    isError: permsError,
  } = useRolePermissions(role.id);

  const { data: catalogData, isLoading: catalogLoading } = usePermissions({
    limit: 100,
    search: catalogSearch.trim() || undefined,
  });

  const grantMutation = useGrantPermission(role.id);
  const revokeMutation = useRevokePermission(role.id);

  const grantedPermissions = React.useMemo(
    () => rolePermData?.permissions ?? [],
    [rolePermData?.permissions],
  );
  const grantedIdsSet = React.useMemo(
    () => new Set(grantedPermissions.map((p) => p.id)),
    [grantedPermissions],
  );

  const filteredGranted = React.useMemo(() => {
    if (!permissionSearch) return grantedPermissions;
    const q = permissionSearch.toLowerCase();
    return grantedPermissions.filter(
      (p) => p.key.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q),
    );
  }, [grantedPermissions, permissionSearch]);

  const handleGrant = (permissionId: string, permKey: string) => {
    grantMutation.mutate(permissionId, {
      onSuccess: () => {
        toast.add({
          title: 'Permission granted',
          description: `Granted "${permKey}" to ${role.displayName}.`,
          type: 'success',
        });
      },
      onError: (err) => {
        toast.add({
          title: 'Grant failed',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  const handleRevoke = (permissionId: string, permKey: string) => {
    revokeMutation.mutate(permissionId, {
      onSuccess: () => {
        toast.add({
          title: 'Permission revoked',
          description: `Revoked "${permKey}" from ${role.displayName}.`,
          type: 'success',
        });
      },
      onError: (err) => {
        toast.add({
          title: 'Revocation failed',
          description: err.message,
          type: 'error',
        });
      },
    });
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
            render={<Link href="/app/roles" />}
          >
            <ArrowLeftIcon className="size-3.5" />
            <span>Roles</span>
          </Button>
          <div className="bg-border h-4 w-px" />
          <h1 className="text-foreground max-w-md truncate text-base font-semibold tracking-tight">
            {role.displayName}
          </h1>
          {role.isSystemDefined ? (
            <Badge
              variant="outline"
              className="border-primary/30 text-primary bg-primary/5 gap-1 px-2 py-0.5 font-mono text-[10px] uppercase"
            >
              <LockIcon className="size-3" aria-hidden="true" />
              <span>System Role</span>
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="border-muted text-muted-foreground gap-1 px-2 py-0.5 font-mono text-[10px] uppercase"
            >
              <span>Custom Role</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!role.isSystemDefined && (
            <PermissionGuard require="role:update">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                render={<Link href={`/app/roles/${role.id}/edit`} />}
              >
                <Edit3Icon className="size-3.5" />
                <span>Edit Role</span>
              </Button>
            </PermissionGuard>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* FastTab 1: Role Overview */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <KeyRoundIcon className="text-primary size-4" />
                <span>Role Metadata</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Structural role identity and governance classification.
              </CardDescription>
            </CardHeader>
            <CardContent className="border-border/40 space-y-3 border-t pt-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Role Key (Immutable)
                </span>
                <code className="bg-muted/60 text-foreground mt-1 block rounded px-2 py-1 font-mono text-xs">
                  {role.key}
                </code>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Display Name
                </span>
                <p className="text-foreground mt-0.5 font-medium">{role.displayName}</p>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Classification
                </span>
                <p className="text-muted-foreground mt-0.5">
                  {role.isSystemDefined
                    ? 'Built-in platform role (core system protected)'
                    : 'Custom defined institutional role'}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Created At
                </span>
                <p className="text-muted-foreground mt-0.5">{formatDateTime(role.createdAt)}</p>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Last Updated
                </span>
                <p className="text-muted-foreground mt-0.5">{formatDateTime(role.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FastTab 2: Granted Permissions Matrix */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheckIcon className="text-primary size-4" />
                  <span>Granted Permissions ({grantedPermissions.length})</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Capabilities assigned to this role across ERP resources.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <PermissionGuard require="role:update">
                  <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
                    <DialogTrigger className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold shadow-xs">
                      <PlusIcon className="size-3.5" />
                      <span>Grant Permission</span>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="text-sm font-semibold">
                          Grant Permission to {role.displayName}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                          Select permissions from the system catalog to add to this role.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-3 py-2">
                        <Input
                          placeholder="Search permission catalog..."
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                          className="h-8 text-xs"
                        />

                        <div className="border-border/80 max-h-60 overflow-y-auto rounded-md border">
                          {catalogLoading ? (
                            <div className="space-y-2 p-4">
                              <Skeleton className="h-6 w-full" />
                              <Skeleton className="h-6 w-full" />
                            </div>
                          ) : (
                            <Table>
                              <TableBody>
                                {catalogData?.items
                                  ?.filter((p) => !grantedIdsSet.has(p.id))
                                  .map((p) => (
                                    <TableRow key={p.id}>
                                      <TableCell className="py-2 text-xs">
                                        <div className="text-foreground font-mono text-[11px] font-semibold">
                                          {p.key}
                                        </div>
                                        <div className="text-muted-foreground text-[11px]">
                                          {p.description}
                                        </div>
                                      </TableCell>
                                      <TableCell className="w-20 py-2 text-right text-xs">
                                        <Button
                                          size="xs"
                                          className="h-6 text-[10px]"
                                          disabled={
                                            grantMutation.isPending &&
                                            grantMutation.variables === p.id
                                          }
                                          onClick={() => handleGrant(p.id, p.key)}
                                        >
                                          Grant
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setGrantDialogOpen(false)}
                        >
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </PermissionGuard>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                  <Input
                    placeholder="Filter granted permissions..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              {permsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : permsError ? (
                <div className="border-destructive/20 bg-destructive/5 text-destructive rounded-md border p-4 text-xs">
                  Failed to load granted permissions.
                </div>
              ) : filteredGranted.length === 0 ? (
                <div className="border-border/80 rounded-lg border border-dashed py-8 text-center">
                  <ShieldAlertIcon className="text-muted-foreground/60 mx-auto mb-2 size-8" />
                  <p className="text-foreground text-xs font-semibold">
                    {permissionSearch ? 'No matching permissions' : 'No permissions granted'}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {permissionSearch
                      ? 'No granted permissions match the search criteria.'
                      : 'This role does not currently grant any explicit capabilities.'}
                  </p>
                </div>
              ) : (
                <div className="border-border/80 overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="h-9 text-xs">Permission Key</TableHead>
                        <TableHead className="h-9 text-xs">Display Name</TableHead>
                        <TableHead className="h-9 w-20 text-right text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGranted.map((perm) => (
                        <TableRow key={perm.id}>
                          <TableCell className="text-foreground font-mono text-xs font-medium">
                            {perm.key}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {perm.displayName}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            <PermissionGuard require="role:update">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="size-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20"
                                onClick={() => handleRevoke(perm.id, perm.key)}
                                disabled={
                                  revokeMutation.isPending && revokeMutation.variables === perm.id
                                }
                                aria-label={`Revoke ${perm.key}`}
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            </PermissionGuard>
                          </TableCell>
                        </TableRow>
                      ))}
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
