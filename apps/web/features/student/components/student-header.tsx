import { Building, Calendar, GraduationCap, IdCard, User } from 'lucide-react';
import Link from 'next/link';

import type { StudentProfile } from '../schemas/student.schema';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

interface StudentHeaderProps {
  profile: StudentProfile;
}

export function StudentHeader({ profile }: StudentHeaderProps) {
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
                {fullName}
              </h1>
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400"
              >
                {profile.status}
              </Badge>
              {profile.currentSemester && (
                <Badge variant="secondary" className="font-mono text-xs">
                  Semester {profile.currentSemester.number} (
                  {profile.currentSemester.academicYearLabel})
                </Badge>
              )}
            </div>

            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <div className="flex items-center gap-1.5">
                <IdCard className="size-4 shrink-0" />
                <span className="font-mono">Roll: {profile.rollNumber}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GraduationCap className="size-4 shrink-0" />
                <span>
                  {profile.program.name} ({profile.program.code})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building className="size-4 shrink-0" />
                <span>{profile.department.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="size-4 shrink-0" />
                <span>Enrolled {new Date(profile.admissionDate).getFullYear()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/student/profile"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <User className="mr-1.5 size-4" />
            Manage Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
