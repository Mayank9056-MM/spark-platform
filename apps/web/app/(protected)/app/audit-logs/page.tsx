'use client';

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  LockIcon,
  ShieldCheckIcon,
} from 'lucide-react';

import { PageHeader } from '@/components/erp/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit & Security Telemetry"
        description="Immutable system transaction logs, authentication telemetry, and administrative action records."
        badge="Platform Telemetry"
      />

      {/* Honest Architectural Status Banner */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <AlertCircleIcon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1.5">
            <h2 className="text-foreground text-sm font-semibold">
              Audit Telemetry Pipeline Active &bull; Query API Endpoint Staged
            </h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Every administrative mutation (user provisioning, role assignment grants/revocations,
              academic unit updates, and admission lifecycle events) is persistently recorded in the
              database by backend transaction interceptors. The public query endpoint (
              <code className="bg-muted/60 rounded px-1 py-0.5 font-mono text-[11px]">
                GET /api/v1/audit-logs
              </code>
              ) is staged and awaiting core gateway deployment. To preserve institutional integrity,
              zero simulated logs are displayed.
            </p>
          </div>
        </div>
      </div>

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
              <Badge variant="secondary" className="font-mono text-[10px]">
                STAGED
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
              <span>Admissions intake & cancellations</span>
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
    </div>
  );
}
