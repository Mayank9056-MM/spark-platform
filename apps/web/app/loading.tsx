import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div role="status" className="flex items-center gap-2 text-sm">
        <Spinner aria-hidden="true" />
        <span>Loading…</span>
      </div>
    </main>
  );
}
