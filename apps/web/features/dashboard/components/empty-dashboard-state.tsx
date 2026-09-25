'use client';

import { Building2Icon, InboxIcon } from 'lucide-react';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

/**
 * Clean institutional empty state shown when an authenticated staff/user
 * does not have operational permissions assigned for the operational directory.
 */
export function EmptyDashboardState() {
  return (
    <div className="col-span-full py-8">
      <Empty className="border-border/80 bg-card mx-auto max-w-lg rounded-lg border p-8 shadow-xs">
        <EmptyHeader className="space-y-2">
          <EmptyMedia
            variant="icon"
            className="bg-primary/10 border-primary/20 text-primary mx-auto size-12 rounded-full border"
          >
            <InboxIcon aria-hidden="true" className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-foreground text-base font-semibold">
            Account Setup in Progress
          </EmptyTitle>
          <EmptyDescription className="text-muted-foreground text-xs leading-relaxed">
            Your account is active. Institutional modules and operational workspaces will appear
            here once role assignments are configured by the college administration.
          </EmptyDescription>
          <div className="text-muted-foreground/80 flex items-center justify-center gap-1.5 pt-2 text-[11px]">
            <Building2Icon className="text-primary size-3" aria-hidden="true" />
            <span>HVPM College of Engineering &amp; Technology</span>
          </div>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
