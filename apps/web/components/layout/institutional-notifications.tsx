'use client';

import { BellIcon, CheckCircle2Icon, NetworkIcon, ShieldCheckIcon } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

export function InstitutionalNotifications() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground relative"
            aria-label="Institutional notifications and system updates"
          >
            <BellIcon className="size-4" aria-hidden="true" />
            <span
              className="bg-primary absolute top-1.5 right-1.5 size-1.5 rounded-full"
              aria-hidden="true"
            />
          </Button>
        }
      />
      <PopoverContent align="end" className="border-border/80 w-80 rounded-lg border p-0 shadow-lg">
        <div className="border-border/70 flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-2">
            <span className="font-heading text-foreground text-xs font-semibold">
              Institutional Updates
            </span>
            <Badge
              variant="outline"
              className="border-primary/30 text-primary h-4 px-1 py-0 font-mono text-[9px] uppercase"
            >
              Live
            </Badge>
          </div>
          <span className="text-muted-foreground font-mono text-[10px]">HVPM-AMV</span>
        </div>

        <div className="space-y-1.5 p-2 text-xs">
          <div className="hover:bg-muted/40 flex items-start gap-2.5 rounded-md p-2 transition-colors">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-0.5">
              <p className="text-foreground text-xs font-medium">Academic Session Active</p>
              <p className="text-muted-foreground text-[11px] leading-snug">
                Academic Year 2025-26 Odd Semester catalogs and policies synchronized.
              </p>
            </div>
          </div>

          <Separator className="my-1" />

          <div className="hover:bg-muted/40 flex items-start gap-2.5 rounded-md p-2 transition-colors">
            <ShieldCheckIcon className="text-primary mt-0.5 size-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-foreground text-xs font-medium">Access Governance Enforced</p>
              <p className="text-muted-foreground text-[11px] leading-snug">
                Role-based authorization active across all institutional operations.
              </p>
            </div>
          </div>

          <Separator className="my-1" />

          <div className="hover:bg-muted/40 flex items-start gap-2.5 rounded-md p-2 transition-colors">
            <NetworkIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-foreground text-xs font-medium">Campus Node Connected</p>
              <p className="text-muted-foreground text-[11px] leading-snug">
                Connected to AMV-01 Core Server at HVPM COET Amravati.
              </p>
            </div>
          </div>
        </div>

        <div className="border-border/70 bg-muted/20 border-t p-2 text-center">
          <span className="text-muted-foreground text-[10px]">
            S.P.A.R.K. Enterprise System Status: Nominal
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
