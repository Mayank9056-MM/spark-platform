import {
  ArchiveIcon,
  BanIcon,
  CheckCircle2Icon,
  ClockIcon,
  LockIcon,
  type LucideIcon,
  ShieldAlertIcon,
} from 'lucide-react';

import type { UserStatus } from '../schemas/user.schema';

import { Badge } from '@/components/ui/badge';

interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  className: string;
  icon: LucideIcon;
}

const STATUS_CONFIG: Record<UserStatus, StatusConfig> = {
  ACTIVE: {
    label: 'Active',
    variant: 'outline',
    className: 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
    icon: CheckCircle2Icon,
  },
  PENDING_ACTIVATION: {
    label: 'Pending',
    variant: 'outline',
    className: 'border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10',
    icon: ClockIcon,
  },
  SUSPENDED: {
    label: 'Suspended',
    variant: 'outline',
    className: 'border-orange-500/30 text-orange-700 dark:text-orange-400 bg-orange-500/10',
    icon: ShieldAlertIcon,
  },
  LOCKED: {
    label: 'Locked',
    variant: 'destructive',
    className: 'border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-500/10',
    icon: LockIcon,
  },
  DEACTIVATED: {
    label: 'Deactivated',
    variant: 'secondary',
    className: 'border-muted text-muted-foreground bg-muted/40',
    icon: BanIcon,
  },
  ARCHIVED: {
    label: 'Archived',
    variant: 'secondary',
    className: 'border-slate-500/20 text-slate-500 bg-slate-500/10',
    icon: ArchiveIcon,
  },
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    variant: 'secondary' as const,
    className: '',
    icon: ClockIcon,
  };

  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`gap-1 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${config.className}`}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  );
}
