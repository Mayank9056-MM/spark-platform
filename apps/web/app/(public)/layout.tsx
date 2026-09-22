import type { ReactNode } from 'react';

/** Centers every public (unauthenticated) page's card, matching the pattern already used by loading.tsx/not-found.tsx/error.tsx. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 items-center justify-center p-4">{children}</main>;
}
