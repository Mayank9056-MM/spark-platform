import { InboxIcon } from 'lucide-react';

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
    <div className="col-span-full">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <InboxIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Nothing to show yet</EmptyTitle>
          <EmptyDescription>
            Your account doesn&apos;t currently have access to any dashboard modules.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
