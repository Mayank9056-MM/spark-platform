'use client';

import * as React from 'react';

import { HvpmLogo } from './hvpm-logo';

import { Badge } from '@/components/ui/badge';

/**
 * Streamlined Mobile Institutional Identity Header for S.P.A.R.K.
 *
 * Rendered on screens < 1024px. Keeps the real HVPM logo and S.P.A.R.K. identity
 * while dropping heavy decorative narrative, directly prioritizing the authentication task.
 */
export function AuthMobileBrand() {
  return (
    <div className="flex flex-col items-center space-y-2.5 pb-2 text-center select-none lg:hidden">
      {/* Real HVPM Logo in clean subtle frame */}
      <div className="bg-card border-border/80 inline-flex rounded-lg border p-2 shadow-xs">
        <HvpmLogo
          size="mobile"
          className="h-12 w-auto"
          alt="HVPM College of Engineering and Technology emblem"
          priority
        />
      </div>

      <div className="space-y-0.5">
        <div className="flex items-center justify-center gap-2">
          <span className="font-heading text-foreground text-lg font-extrabold tracking-wider">
            S.P.A.R.K.
          </span>
          <Badge
            variant="outline"
            className="text-muted-foreground border-border/90 bg-muted/40 px-1.5 py-0 font-mono text-[10px] tracking-wider uppercase"
          >
            College ERP
          </Badge>
        </div>
        <p className="text-foreground/90 text-xs font-semibold">
          HVPM College of Engineering and Technology
        </p>
        <p className="text-muted-foreground text-[11px]">
          Amravati • Strategic Platform for Analytics, Reports &amp; Knowledgeflow
        </p>
      </div>
    </div>
  );
}
