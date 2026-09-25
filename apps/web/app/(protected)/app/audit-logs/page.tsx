'use client';

import { CheckCircle2Icon, DatabaseIcon, LockIcon, ShieldCheckIcon } from 'lucide-react';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { RequireRole } from '@/components/auth/require-role';
import { PageHeader } from '@/components/erp/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLogsTable } from '@/features/audit-logs';

export default function AuditLogsPage() {
  return (
    <RequireRole allow={['admin', 'super_admin']}>
      <div className="space-y-6">
        <PageHeader
          title="Audit & Security Telemetry"
          description="Immutable system transaction logs, authentication telemetry, and administrative action records."
          badge="Platform Telemetry"
        />

        {/* Telemetry Architecture Overview */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                <DatabaseIcon className="text-primary size-3.5" />
                <span>Storage Architecture</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Log Ingestion:</span>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-700"
                >
                  ENABLED
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Immutability:</span>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-700"
                >
                  APPEND-ONLY
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">HTTP Query Surface:</span>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-700"
                >
                  ONLINE (v1)
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                <ShieldCheckIcon className="text-primary size-3.5" />
                <span>Covered Domains</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                <span>User account lifecycle & password resets</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                <span>RBAC role grants & revocations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                <span>Academic units, timetables & admissions</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                <LockIcon className="text-primary size-3.5" />
                <span>Compliance & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                <span>Actor IP & User-Agent capture</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                <span>UTC millisecond timestamping</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                <span>Before/after mutation delta tracking</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Transaction Journal */}
        <PermissionGuard
          require="auditLog:read"
          allowRoles={['super_admin', 'admin']}
          fallback={
            <div className="border-border/80 bg-muted/20 text-muted-foreground rounded-lg border p-8 text-center text-xs">
              You do not have permission to view institutional audit telemetry. Contact a Super
              Admin for access.
            </div>
          }
        >
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-border/60 border-b pb-3">
              <CardTitle className="text-foreground flex items-center justify-between text-sm font-semibold">
                <span>Immutable Transaction Journal</span>
                <span className="text-muted-foreground font-mono text-xs font-normal">
                  Real-time Audit Trail
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <AuditLogsTable />
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>
    </RequireRole>
  );
}
