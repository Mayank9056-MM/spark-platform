'use client';

import { Building2Icon, ClockIcon, MailIcon, PhoneIcon, ShieldCheckIcon } from 'lucide-react';
import * as React from 'react';

import { HvpmLogo } from './hvpm-logo';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ItHelpdeskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Institutional IT Helpdesk & Support Modal for S.P.A.R.K.
 *
 * Provides authenticated and unauthenticated personnel with direct access to
 * Central Computer Center contact info, physical location, campus extensions,
 * and standard operating support procedures.
 */
export function ItHelpdeskDialog({ open, onOpenChange }: ItHelpdeskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card max-w-lg gap-4 sm:gap-5">
        <DialogHeader className="gap-2 text-left">
          <div className="flex items-center gap-3">
            <div className="border-brand-gold/30 bg-brand-navy flex size-10 shrink-0 items-center justify-center rounded-md border p-1">
              <HvpmLogo size="nav" className="size-8" alt="HVPM Logo" priority={false} />
            </div>
            <div>
              <DialogTitle className="text-foreground text-base font-semibold">
                HVPM COET IT Helpdesk
              </DialogTitle>
              <p className="text-muted-foreground text-xs font-medium">
                Central Computer Center (CCC) • S.P.A.R.K. Support
              </p>
            </div>
          </div>
          <DialogDescription className="text-muted-foreground text-xs leading-relaxed">
            Support directory for students, faculty, and administrative staff using the Strategic
            Platform for Analytics, Reports &amp; Knowledgeflow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1 text-xs">
          <div className="border-border/90 bg-muted/30 space-y-3 rounded-md border p-3.5">
            <div className="text-muted-foreground flex items-start gap-2.5">
              <Building2Icon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-foreground font-semibold">Central Computer Center (CCC)</p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Main Administrative Building, Ground Floor, HVPM COET Campus, Hanuman Vyayam
                  Nagar, Amravati, Maharashtra – 444605
                </p>
              </div>
            </div>

            <div className="text-muted-foreground flex items-center gap-2.5">
              <MailIcon className="text-primary size-4 shrink-0" aria-hidden="true" />
              <div>
                <span className="text-foreground font-semibold">Official Email: </span>
                <a
                  href="mailto:erp-support@hvpmcoet.in"
                  className="text-primary font-medium underline-offset-3 hover:underline"
                >
                  erp-support@hvpmcoet.in
                </a>
              </div>
            </div>

            <div className="text-muted-foreground flex items-center gap-2.5">
              <PhoneIcon className="text-primary size-4 shrink-0" aria-hidden="true" />
              <div>
                <span className="text-foreground font-semibold">Campus Intercom: </span>
                <span className="text-foreground/90">+91 (0721) 2572458 • Ext. 201 / 202</span>
              </div>
            </div>

            <div className="text-muted-foreground flex items-center gap-2.5">
              <ClockIcon className="text-primary size-4 shrink-0" aria-hidden="true" />
              <div>
                <span className="text-foreground font-semibold">Working Hours: </span>
                <span className="text-foreground/90">
                  Monday – Saturday: 9:30 AM to 5:30 PM IST
                </span>
                <p className="text-muted-foreground/80 text-[10px]">
                  (Closed on 2nd &amp; 4th Saturdays and University Holidays)
                </p>
              </div>
            </div>
          </div>

          <div className="border-border/60 bg-surface-secondary text-muted-foreground space-y-1.5 rounded-md border p-3 text-[11px] leading-relaxed">
            <div className="text-foreground flex items-center gap-1.5 font-semibold">
              <ShieldCheckIcon className="text-brand-gold size-3.5 shrink-0" aria-hidden="true" />
              <span>Standard Operational Guidance:</span>
            </div>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>
                <strong className="text-foreground font-medium">New Account Activation:</strong> Use
                the single-use activation link dispatched to your registered institutional email.
              </li>
              <li>
                <strong className="text-foreground font-medium">Forgotten Credentials:</strong>{' '}
                Submit a reset request using your registered email address to receive secure
                recovery steps.
              </li>
              <li>
                <strong className="text-foreground font-medium">Account Lockout:</strong> For
                security, accounts lock after 5 consecutive failed attempts. Contact the Helpdesk
                for identity verification.
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-end">
          <DialogClose
            render={
              <Button
                variant="outline"
                size="sm"
                className="border-border h-8.5 px-4 text-xs font-medium"
              >
                Close
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
