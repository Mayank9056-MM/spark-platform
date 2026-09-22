import { PlugZapIcon } from 'lucide-react';

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
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PlugZapIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Not connected to live data yet</EmptyTitle>
        <EmptyDescription>
          {resource} will appear here once this module is connected to the API.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
