import { InboxIcon, ShieldCheckIcon } from 'lucide-react';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

/** Shown when a signed-in user's permissions unlock zero sections — this is the exact, non-fabricated state a `student` sees today. */
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
            No active modules available
          </EmptyTitle>
          <EmptyDescription className="text-muted-foreground text-xs leading-relaxed">
            Your account does not currently have permissions assigned for active operational
            modules. Academic records and term registrations will appear here when authorized.
          </EmptyDescription>
          <div className="text-muted-foreground/80 flex items-center justify-center gap-1.5 pt-2 text-[11px]">
            <ShieldCheckIcon className="text-primary size-3" aria-hidden="true" />
            <span>HVPM COET Access Governance</span>
          </div>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
