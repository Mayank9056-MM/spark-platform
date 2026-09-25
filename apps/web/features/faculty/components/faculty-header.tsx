import { Building2, Calendar, RefreshCw, ShieldCheck } from 'lucide-react';

import type { FacultyProfile } from '../schemas/faculty.schema';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FacultyHeaderProps {
  profile: FacultyProfile;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function FacultyHeader({ profile, onRefresh, isRefreshing }: FacultyHeaderProps) {
  const fullName = [profile.user.firstName, profile.user.middleName, profile.user.lastName]
    .filter(Boolean)
    .join(' ');

  const initials =
    `${profile.user.firstName.charAt(0)}${profile.user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="border-border bg-card relative overflow-hidden rounded-none border p-6 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="border-border size-16 rounded-none border">
            {profile.user.avatarUrl && <AvatarImage src={profile.user.avatarUrl} alt={fullName} />}
            <AvatarFallback className="bg-primary/10 text-primary rounded-none font-mono text-lg font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight">
                Prof. {fullName}
              </h1>
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary font-mono text-xs font-semibold"
              >
                {profile.role.displayName}
              </Badge>
              {profile.activeAcademicYear && (
                <Badge variant="secondary" className="font-mono text-xs">
                  AY {profile.activeAcademicYear.label}
                </Badge>
              )}
            </div>

            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <div className="flex items-center gap-1.5">
                <Building2 className="size-4 shrink-0" />
                <span>
                  {profile.department
                    ? `${profile.department.name} (${profile.department.code})`
                    : 'Institutional Faculty'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 shrink-0 text-emerald-500" />
                <span>Status: {profile.user.status}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="size-4 shrink-0" />
                <span>Shri HVPM COET, Amravati</span>
              </div>
            </div>
          </div>
        </div>

        {onRefresh && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="rounded-none"
            >
              <RefreshCw className={`mr-1.5 size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
