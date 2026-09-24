'use client';

import * as React from 'react';

import { ItHelpdeskDialog } from './it-helpdesk-dialog';

/**
 * Minimal Institutional Enterprise Footer for S.P.A.R.K.
 *
 * Implements restrained, authoritative attribution adhering to enterprise ERP standards.
 * Excludes superficial marketing links, social media widgets, or speculative legal pages.
 */
export function AuthFooter() {
  const [helpOpen, setHelpOpen] = React.useState(false);

  return (
    <>
      <footer className="border-border/80 bg-card/60 w-full shrink-0 border-t py-3.5 transition-colors select-none">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-[11px] sm:flex-row sm:px-6 sm:text-xs lg:px-8">
          {/* Institutional Identification */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            <span className="text-foreground font-semibold tracking-wide">S.P.A.R.K.</span>
            <span className="text-muted-foreground/60">•</span>
            <span className="text-foreground/90 font-medium">HVPM COET</span>
            <span className="text-muted-foreground/60">•</span>
            <span>Institutional ERP</span>
          </div>

          {/* Copyright & Helpdesk Link */}
          <div className="flex items-center gap-3">
            <span>© HVPM College of Engineering and Technology, Amravati</span>
            <span className="text-muted-foreground/60 hidden sm:inline">•</span>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="text-primary focus-visible:ring-ring rounded-xs underline-offset-3 hover:underline focus-visible:ring-1 focus-visible:outline-none"
            >
              IT Helpdesk
            </button>
          </div>
        </div>
      </footer>

      <ItHelpdeskDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
