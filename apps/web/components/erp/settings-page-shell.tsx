'use client';

import { BellIcon, GlobeIcon, KeyRoundIcon } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface SettingsSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  content: React.ReactNode;
}

export interface SettingsPageShellProps {
  title?: string;
  description?: string;
  sections?: readonly SettingsSection[];
}

/**
 * Enterprise Settings Page pattern inspired by Microsoft Dynamics 365 Business Central.
 * Features:
 * - Two-column master-detail layout (Left: navigation rail; Right: active settings canvas)
 * - Structured categories: General, Profile, Security, Notifications, Preferences
 */
export function SettingsPageShell({
  title = 'System & User Settings',
  description = 'Manage personal preferences, security credentials, and institutional environment options.',
  sections = [
    {
      id: 'general',
      label: 'General & Campus',
      icon: GlobeIcon,
      description: 'Institutional environment and locale preferences.',
      content: (
        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <span className="text-foreground font-semibold">Campus Node</span>
            <p className="text-muted-foreground text-[11px]">
              HVPM College of Engineering &amp; Technology, Amravati (Node AMV-01)
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-foreground font-semibold">Active Term</span>
            <p className="text-muted-foreground text-[11px]">
              Academic Year 2025–26 • Odd Semester
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'security',
      label: 'Security & Access',
      icon: KeyRoundIcon,
      description: 'Account authorization, RBAC tokens, and credential management.',
      content: (
        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <span className="text-foreground font-semibold">Authentication Policy</span>
            <p className="text-muted-foreground text-[11px]">
              HttpOnly session cookies with automatic token renewal and idle timeout enforcement.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: BellIcon,
      description: 'Institutional announcements and academic notice channels.',
      content: (
        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <span className="text-foreground font-semibold">Institutional Alerts</span>
            <p className="text-muted-foreground text-[11px]">
              Real-time operational alerts for system updates and academic schedule changes.
            </p>
          </div>
        </div>
      ),
    },
  ],
}: SettingsPageShellProps) {
  const [activeSectionId, setActiveSectionId] = React.useState(sections[0]?.id ?? 'general');
  const activeSection = sections.find((s) => s.id === activeSectionId) ?? sections[0];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="border-border/70 flex flex-col gap-1 border-b pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-foreground font-heading text-xl font-bold tracking-tight sm:text-2xl">
            {title}
          </h1>
          <Badge
            variant="outline"
            className="border-primary/30 text-primary font-mono text-[10px] uppercase"
          >
            Settings
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
      </div>

      {/* Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Navigation Rail */}
        <nav className="flex flex-col gap-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeSectionId;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSectionId(section.id)}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary border-primary border-l-2 font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{section.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Pane */}
        <div className="md:col-span-3">
          {activeSection && (
            <Card className="border-border/80 bg-card rounded-lg border shadow-xs">
              <CardHeader className="border-border/70 border-b pb-3">
                <CardTitle className="text-foreground text-sm font-bold">
                  {activeSection.label}
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs">
                  {activeSection.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">{activeSection.content}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
