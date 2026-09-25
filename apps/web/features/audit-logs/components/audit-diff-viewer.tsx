'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AuditDiffViewerProps {
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

interface FieldDiff {
  key: string;
  status: DiffStatus;
  before: unknown;
  after: unknown;
}

function formatValue(val: unknown): string {
  if (val === undefined) return '—';
  if (val === null) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number' || typeof val === 'bigint') return val.toString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return JSON.stringify(val) ?? '—';
}

export function AuditDiffViewer({ oldValue, newValue }: AuditDiffViewerProps) {
  const [onlyChanges, setOnlyChanges] = React.useState(true);
  const [showRawJson, setShowRawJson] = React.useState(false);

  const diffs: FieldDiff[] = React.useMemo(() => {
    const oldObj = oldValue ?? {};
    const newObj = newValue ?? {};

    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).sort();

    return allKeys.map((key) => {
      const hasOld = Object.prototype.hasOwnProperty.call(oldObj, key);
      const hasNew = Object.prototype.hasOwnProperty.call(newObj, key);
      const before = oldObj[key];
      const after = newObj[key];

      let status: DiffStatus = 'unchanged';
      if (!hasOld && hasNew) {
        status = 'added';
      } else if (hasOld && !hasNew) {
        status = 'removed';
      } else if (JSON.stringify(before) !== JSON.stringify(after)) {
        status = 'modified';
      }

      return { key, status, before, after };
    });
  }, [oldValue, newValue]);

  const visibleDiffs = onlyChanges ? diffs.filter((d) => d.status !== 'unchanged') : diffs;
  const hasChanges = diffs.some((d) => d.status !== 'unchanged');

  if (!oldValue && !newValue) {
    return (
      <div className="border-border/60 bg-muted/20 text-muted-foreground rounded-lg border p-4 text-center text-xs">
        No state payload snapshot was recorded for this transaction.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setOnlyChanges((prev) => !prev)}
          >
            {onlyChanges ? 'Show all fields' : 'Show changes only'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-7 text-xs"
            onClick={() => setShowRawJson((prev) => !prev)}
          >
            {showRawJson ? 'Hide raw JSON' : 'View raw JSON'}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Changes detected:</span>
          <Badge variant={hasChanges ? 'default' : 'secondary'} className="font-mono text-[10px]">
            {diffs.filter((d) => d.status !== 'unchanged').length} fields
          </Badge>
        </div>
      </div>

      {showRawJson ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs font-semibold">
              Previous State (oldValue)
            </span>
            <pre className="border-border/80 bg-muted/40 max-h-80 overflow-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed">
              {oldValue ? JSON.stringify(oldValue, null, 2) : 'null'}
            </pre>
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs font-semibold">
              New State (newValue)
            </span>
            <pre className="border-border/80 bg-muted/40 max-h-80 overflow-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed">
              {newValue ? JSON.stringify(newValue, null, 2) : 'null'}
            </pre>
          </div>
        </div>
      ) : visibleDiffs.length === 0 ? (
        <div className="border-border/60 bg-muted/20 text-muted-foreground rounded-lg border p-4 text-center text-xs">
          No differences found between oldValue and newValue.
        </div>
      ) : (
        <div className="border-border/80 overflow-hidden rounded-md border">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/80">
                <TableHead className="w-[180px] text-xs font-semibold">Field</TableHead>
                <TableHead className="w-[90px] text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Previous Value</TableHead>
                <TableHead className="text-xs font-semibold">Updated Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleDiffs.map((diff) => (
                <TableRow key={diff.key} className="border-border/60">
                  <TableCell className="font-mono text-xs font-semibold">{diff.key}</TableCell>
                  <TableCell>
                    {diff.status === 'added' && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700"
                      >
                        Added
                      </Badge>
                    )}
                    {diff.status === 'removed' && (
                      <Badge
                        variant="outline"
                        className="border-destructive/30 bg-destructive/10 text-destructive text-[10px]"
                      >
                        Removed
                      </Badge>
                    )}
                    {diff.status === 'modified' && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                      >
                        Modified
                      </Badge>
                    )}
                    {diff.status === 'unchanged' && (
                      <Badge variant="secondary" className="text-muted-foreground text-[10px]">
                        Unchanged
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[240px] truncate font-mono text-[11px]">
                    {diff.status === 'removed' ? (
                      <span className="text-destructive/90 line-through">
                        {formatValue(diff.before)}
                      </span>
                    ) : (
                      formatValue(diff.before)
                    )}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate font-mono text-[11px]">
                    {diff.status === 'added' ? (
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        {formatValue(diff.after)}
                      </span>
                    ) : diff.status === 'modified' ? (
                      <span className="text-foreground font-medium">{formatValue(diff.after)}</span>
                    ) : (
                      <span className="text-muted-foreground">{formatValue(diff.after)}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
