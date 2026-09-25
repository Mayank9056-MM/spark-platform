import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { HvpmLogo } from '@/features/auth';

/**
 * Root loading experience for S.P.A.R.K.
 *
 * Renders an institutional skeleton structure resembling the ERP application
 * layout rather than a blank screen with a solitary spinner.
 */
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-1 flex-col space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Brand & Loading Status Indicator */}
      <div className="border-border/80 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2.5">
          <HvpmLogo size="nav" className="h-7 w-auto shrink-0" priority />
          <div className="flex items-center gap-2">
            <span className="font-heading text-foreground text-sm font-bold tracking-wider">
              S.P.A.R.K.
            </span>
            <span className="text-muted-foreground text-xs">• Loading campus workspace…</span>
          </div>
        </div>
        <div role="status" className="text-muted-foreground flex items-center gap-2 text-xs">
          <Spinner aria-hidden="true" className="text-primary size-3.5" />
          <span className="hidden sm:inline">Connecting to HVPM network…</span>
        </div>
      </div>

      {/* Dashboard Section Skeletons */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="border-border/70 bg-card space-y-4 rounded-lg border p-5 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4 rounded-sm" />
                <Skeleton className="h-3 w-1/2 rounded-sm" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-md" />
            <div className="flex justify-between pt-2">
              <Skeleton className="h-4 w-16 rounded-sm" />
              <Skeleton className="h-7 w-20 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
