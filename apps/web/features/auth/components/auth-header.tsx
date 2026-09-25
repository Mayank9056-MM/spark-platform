'use client';

import { HelpCircleIcon, ShieldCheckIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { LOGIN_PATH } from '../constants';

import { HvpmLogo } from './hvpm-logo';
import { ItHelpdeskDialog } from './it-helpdesk-dialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Enterprise Application Header for S.P.A.R.K. Authentication Shell.
 *
 * Implements a disciplined Microsoft Dynamics 365 / Fluent-style top bar
 * with institutional branding on the left and accessible IT Helpdesk controls
 * on the right.
 */
export function AuthHeader() {
  const [helpOpen, setHelpOpen] = React.useState(false);

  return (
    <>
      <header className="border-border/90 bg-card/95 sticky top-0 z-20 flex h-13 w-full shrink-0 items-center justify-between border-b px-4 backdrop-blur-md transition-colors select-none sm:h-14 sm:px-6 lg:px-8">
        {/* Left: Compact Institutional Identity */}
        <Link
          href={LOGIN_PATH}
          className="focus-visible:ring-ring flex items-center gap-3 rounded-sm py-1 transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:outline-none"
          aria-label="S.P.A.R.K. College ERP - HVPM COET"
        >
          <HvpmLogo size="nav" className="h-8.5 w-auto" alt="HVPM COET emblem" priority />
          <div className="flex items-center gap-2.5">
            <span className="font-heading text-foreground text-sm font-bold tracking-wider sm:text-base">
              S.P.A.R.K.
            </span>
            <div className="bg-border/80 hidden h-3.5 w-px sm:block" aria-hidden="true" />
            <span className="text-muted-foreground hidden text-xs font-medium tracking-tight sm:inline-block">
              HVPM COET
            </span>
            <Badge
              variant="outline"
              className="text-muted-foreground border-border/90 bg-surface-secondary hidden px-1.5 py-0 font-mono text-[10px] tracking-wider md:inline-flex"
            >
              Institutional ERP
            </Badge>
          </div>
        </Link>

        {/* Right: Institutional System Status & Help Support Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-muted-foreground border-border/80 hidden items-center gap-1.5 border-r pr-2 text-[11px] lg:flex">
            <ShieldCheckIcon className="text-brand-gold size-3.5 shrink-0" aria-hidden="true" />
            <span>Secure Campus Gateway</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHelpOpen(true)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/70 focus-visible:ring-ring h-8 gap-1.5 px-2.5 text-xs transition-colors focus-visible:ring-1"
            aria-label="Open IT Helpdesk and System Support details"
          >
            <HelpCircleIcon
              className="text-muted-foreground/90 size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Help &amp; IT Support</span>
            <span className="sm:hidden">Helpdesk</span>
          </Button>
        </div>
      </header>

      {/* IT Helpdesk Modal Dialog */}
      <ItHelpdeskDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
