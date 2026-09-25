import { DatabaseIcon, InfoIcon } from 'lucide-react';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface ModuleNotConnectedProps {
  resource: string;
}

/** Honest "no live data source wired up yet" state. Never a fabricated row, count, or chart. */
export function ModuleNotConnected({ resource }: ModuleNotConnectedProps) {
  return (
    <div className="py-6">
      <Empty className="border-border/80 bg-card mx-auto max-w-lg rounded-lg border p-8 shadow-xs">
        <EmptyHeader className="space-y-2">
          <EmptyMedia
            variant="icon"
            className="bg-primary/10 border-primary/20 text-primary mx-auto size-12 rounded-full border"
          >
            <DatabaseIcon aria-hidden="true" className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-foreground text-base font-semibold">
            Module connection pending
          </EmptyTitle>
          <EmptyDescription className="text-muted-foreground text-xs leading-relaxed">
            {resource} records will synchronize with this view once the campus backend service is
            connected to this endpoint.
          </EmptyDescription>
          <div className="text-muted-foreground/80 flex items-center justify-center gap-1.5 pt-2 text-[11px]">
            <InfoIcon className="text-primary size-3" aria-hidden="true" />
            <span>S.P.A.R.K. Integration Status: Pending Connection</span>
          </div>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
