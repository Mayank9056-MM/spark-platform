import { BanIcon, CheckCircle2Icon } from 'lucide-react';

import type { AdmissionStatus } from '../schemas/admission.schema';

import { Badge } from '@/components/ui/badge';

export function AdmissionStatusBadge({ status }: { status: AdmissionStatus }) {
  if (status === 'CONFIRMED') {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 uppercase dark:text-emerald-400"
      >
        <CheckCircle2Icon className="size-3" aria-hidden="true" />
        <span>Confirmed</span>
      </Badge>
    );
  }

  if (status === 'CANCELLED') {
    return (
      <Badge
        variant="destructive"
        className="gap-1 border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-700 uppercase dark:text-rose-400"
      >
        <BanIcon className="size-3" aria-hidden="true" />
        <span>Cancelled</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="font-mono text-[10px] uppercase">
      {status}
    </Badge>
  );
}
