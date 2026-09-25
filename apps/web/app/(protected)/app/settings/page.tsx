'use client';

import { Building2Icon, LockIcon, UserIcon } from 'lucide-react';
import * as React from 'react';

import { PageHeader } from '@/components/erp/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth';

export default function SettingsPage() {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Settings"
        description="Core platform configuration, institutional parameters, and security policies for HVPM COET."
        badge="System Configuration"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* FastTab 1: Institution Profile */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-border/40 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Building2Icon className="text-primary size-4" />
                <span>Institutional Profile</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Accredited institution identity and deployment parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                    Institution Name
                  </span>
                  <p className="text-foreground mt-1 text-sm font-semibold">
                    HVPM College of Engineering & Technology
                  </p>
                  <p className="text-muted-foreground text-[11px]">Amravati, Maharashtra, India</p>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                    Platform Identification
                  </span>
                  <p className="text-foreground mt-1 font-mono text-sm font-semibold">
                    S.P.A.R.K. ERP
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Strategic Platform for Analytics, Reports & Knowledgeflow
                  </p>
                </div>
              </div>

              <div className="border-border/40 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                    University Affiliation
                  </span>
                  <p className="text-foreground mt-1 font-medium">SGBAU Amravati</p>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                    Regulatory Code
                  </span>
                  <p className="text-foreground mt-1 font-medium">DTE: 1128 &bull; AICTE</p>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                    Institutional Node
                  </span>
                  <code className="text-foreground bg-muted/60 mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-[11px]">
                    Node AMV-01 (Production)
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FastTab 2: Security & Session Invariants */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-border/40 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <LockIcon className="text-primary size-4" />
                <span>Institutional Security Policies</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Governing security policies enforced across all institutional user sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="border-border/60 bg-muted/20 flex items-center justify-between rounded-md border p-2.5">
                <div>
                  <div className="text-foreground font-semibold">Session Inactivity Lockout</div>
                  <div className="text-muted-foreground text-[11px]">
                    Automatic idle session expiration duration
                  </div>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  15 Minutes
                </Badge>
              </div>

              <div className="border-border/60 bg-muted/20 flex items-center justify-between rounded-md border p-2.5">
                <div>
                  <div className="text-foreground font-semibold">Session Credential Rotation</div>
                  <div className="text-muted-foreground text-[11px]">
                    Sliding window institutional token renewal
                  </div>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  7 Days (Sliding)
                </Badge>
              </div>

              <div className="border-border/60 bg-muted/20 flex items-center justify-between rounded-md border p-2.5">
                <div>
                  <div className="text-foreground font-semibold">Academic Term Invariant</div>
                  <div className="text-muted-foreground text-[11px]">
                    At most one academic year active college-wide
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-700"
                >
                  STRICT ENFORCEMENT
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Operator Context */}
        <div className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-border/40 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <UserIcon className="text-primary size-4" />
                <span>Active Operator Session</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Current authenticated administrative identity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Operator Name
                </span>
                <p className="text-foreground mt-0.5 font-semibold">
                  {currentUser?.user.firstName} {currentUser?.user.lastName}
                </p>
                <p className="text-muted-foreground font-mono text-[11px]">
                  {currentUser?.user.email}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Session Roles
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {currentUser?.roles.map((r) => (
                    <Badge key={r.id} variant="secondary" className="font-mono text-[10px]">
                      {r.displayName}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Operator User ID
                </span>
                <code className="bg-muted/60 text-foreground mt-1 block rounded px-1 py-0.5 font-mono text-[10px] break-all select-all">
                  {currentUser?.user.id}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
