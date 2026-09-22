import { LockIcon } from 'lucide-react';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface ModuleUnavailableProps {
  title: string;
}

/**
 * For modules with no backend authorization resource at all (Faculty
 * today). Deliberately unguarded by role or permission — there is
 * nothing valid to check — and never renders any data, since none can
 * be safely scoped without backend support.
 */
export function ModuleUnavailable({ title }: ModuleUnavailableProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{title}</h1>
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LockIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>This module isn&apos;t available yet</EmptyTitle>
          <EmptyDescription>
            The backend authorization model doesn&apos;t yet define access rules for this area.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
