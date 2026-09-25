'use client';

import {
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  RefreshCwIcon,
  ShieldIcon,
  UserIcon,
} from 'lucide-react';
import * as React from 'react';

import { useAuditLog } from '../hooks/use-audit-log';

import { AuditDiffViewer } from './audit-diff-viewer';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatRelativeTime } from '@/lib/formatters';

interface AuditLogDetailDialogProps {
  logId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getActionBadgeVariant(action: string): {
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  className?: string;
} {
  switch (action) {
    case 'CREATE':
    case 'ROLE_GRANTED':
    case 'ACCOUNT_ACTIVATED':
      return {
        variant: 'outline',
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
      };
    case 'UPDATE':
    case 'ROLE_REVOKED':
    case 'PASSWORD_CHANGED':
      return {
        variant: 'outline',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
      };
    case 'DELETE':
    case 'LOGIN_FAILED':
    case 'SESSION_REVOKED':
      return {
        variant: 'outline',
        className: 'border-destructive/30 bg-destructive/10 text-destructive',
      };
    case 'ARCHIVE':
      return {
        variant: 'secondary',
        className: 'border-border/60 bg-muted/60 text-muted-foreground',
      };
    case 'RESTORE':
    case 'LOGIN':
    case 'LOGOUT':
      return {
        variant: 'outline',
        className: 'border-primary/30 bg-primary/10 text-primary',
      };
    default:
      return { variant: 'secondary' };
  }
}

export function AuditLogDetailDialog({ logId, open, onOpenChange }: AuditLogDetailDialogProps) {
  const { data: log, isLoading, isError, error, refetch } = useAuditLog(open ? logId : null);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldIcon className="text-primary size-4" />
            <DialogTitle className="text-sm font-semibold">Audit Transaction Details</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-xs">
            Complete transaction record, network telemetry, and snapshot delta.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <div className="border-destructive/30 bg-destructive/5 space-y-3 rounded-lg border p-4 text-center">
            <p className="text-destructive text-xs font-medium">
              Failed to load audit record:{' '}
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void refetch();
              }}
              className="h-7 text-xs"
            >
              <RefreshCwIcon className="mr-1.5 size-3" />
              Retry
            </Button>
          </div>
        ) : log ? (
          <div className="space-y-5 text-xs">
            {/* Header info */}
            <div className="bg-muted/30 border-border/70 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Badge
                  {...getActionBadgeVariant(log.action)}
                  className="font-mono text-[10px] uppercase"
                >
                  {log.action}
                </Badge>
                <span className="text-foreground font-semibold">{log.entityType}</span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  ({log.entityId.slice(0, 8)}...)
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleCopy(log.entityId, 'entityId')}
                  title="Copy full entity ID"
                >
                  {copiedKey === 'entityId' ? (
                    <CheckIcon className="size-3 text-emerald-600" />
                  ) : (
                    <CopyIcon className="size-3" />
                  )}
                </Button>
              </div>
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                <CalendarIcon className="size-3.5" />
                <span>{formatDate(log.createdAt)}</span>
                <span>&bull;</span>
                <span>{formatRelativeTime(log.createdAt)}</span>
              </div>
            </div>

            {/* Actor and Network Telemetry */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="border-border/70 space-y-2 rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                  <UserIcon className="size-3.5" />
                  <span>Actor Identity</span>
                </div>
                {log.actor ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8 rounded-md border">
                      {log.actor.avatarUrl && (
                        <AvatarImage src={log.actor.avatarUrl} alt={log.actor.firstName} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary rounded-md text-[11px] font-semibold">
                        {log.actor.firstName[0]}
                        {log.actor.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <p className="text-foreground text-xs font-semibold">
                        {log.actor.firstName} {log.actor.lastName}
                      </p>
                      <p className="text-muted-foreground text-[11px]">{log.actor.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-foreground text-xs font-medium">System Automated Action</p>
                    <p className="text-muted-foreground text-[11px]">
                      {log.actorUserId ? `User ID: ${log.actorUserId}` : 'No interactive actor'}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-border/70 space-y-2 rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                  <GlobeIcon className="size-3.5" />
                  <span>Network & Request Telemetry</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">IP Address:</span>
                    <span className="text-foreground">{log.ipAddress ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Request ID:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-foreground max-w-[140px] truncate">
                        {log.requestId ?? '—'}
                      </span>
                      {log.requestId && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleCopy(log.requestId!, 'reqId')}
                          title="Copy Request ID"
                        >
                          {copiedKey === 'reqId' ? (
                            <CheckIcon className="size-2.5 text-emerald-600" />
                          ) : (
                            <CopyIcon className="size-2.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {log.userAgent && (
                    <div
                      className="text-muted-foreground truncate text-[10px]"
                      title={log.userAgent}
                    >
                      UA: {log.userAgent}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* State Snapshot Diff */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-xs font-semibold">
                  State Transition Snapshot
                </span>
              </div>
              <AuditDiffViewer oldValue={log.oldValue} newValue={log.newValue} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
