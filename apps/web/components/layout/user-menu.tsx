'use client';

import { ChevronDownIcon, LogOutIcon, SettingsIcon, ShieldCheckIcon, UserIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth';
import { hasAnyRole, hasRole } from '@/features/rbac';

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function UserMenu() {
  const { currentUser, logout, isLoggingOut } = useAuth();

  if (currentUser === undefined) {
    return null;
  }

  const { firstName, lastName, email, avatarUrl } = currentUser.user;
  const roles = currentUser.roles;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-muted/70 focus-visible:ring-ring flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-left outline-hidden transition-colors focus-visible:ring-2">
        <Avatar className="border-border/80 size-7 border">
          {avatarUrl !== null && <AvatarImage src={avatarUrl} alt={`${firstName} ${lastName}`} />}
          <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
            {initials(firstName, lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden flex-col text-left sm:flex">
          <span className="text-foreground text-xs leading-tight font-semibold">
            {firstName} {lastName}
          </span>
          <span className="text-muted-foreground text-[10px] leading-none">
            {roles[0]?.displayName ?? 'Authorized User'}
          </span>
        </div>
        <ChevronDownIcon
          className="text-muted-foreground ml-0.5 hidden size-3 sm:block"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="border-border w-56 rounded-md border shadow-md">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-1 p-3">
            <span className="text-foreground text-xs font-semibold">
              {firstName} {lastName}
            </span>
            <span className="text-muted-foreground truncate text-[11px] font-normal">{email}</span>
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1.5">
                {roles.map((role) => (
                  <Badge
                    key={role.key}
                    variant="secondary"
                    className="py-0.2 text-primary bg-primary/10 border-primary/20 h-4 border px-1.5 font-mono text-[9px] uppercase"
                  >
                    <ShieldCheckIcon className="mr-0.5 size-2.5" aria-hidden="true" />
                    {role.displayName}
                  </Badge>
                ))}
              </div>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {hasAnyRole(roles, ['admin', 'super_admin']) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer py-1.5 text-xs"
                onClick={() => {
                  window.location.href = '/app/settings';
                }}
              >
                <SettingsIcon className="text-muted-foreground mr-2 size-3.5" aria-hidden="true" />
                <span>Institutional Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        {hasRole(roles, 'student') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer py-1.5 text-xs"
                onClick={() => {
                  window.location.href = '/app/student/profile';
                }}
              >
                <UserIcon className="text-muted-foreground mr-2 size-3.5" aria-hidden="true" />
                <span>My Student Profile</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isLoggingOut}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer py-2 text-xs"
          onClick={() => {
            logout();
          }}
        >
          {isLoggingOut ? (
            <Spinner aria-hidden="true" className="size-3.5" />
          ) : (
            <LogOutIcon className="size-3.5" aria-hidden="true" />
          )}
          <span>{isLoggingOut ? 'Signing out…' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
