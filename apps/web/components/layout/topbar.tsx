import { Breadcrumbs } from './breadcrumbs';
import { GlobalSearchDialog } from './global-search-dialog';
import { InstitutionalNotifications } from './institutional-notifications';
import { UserMenu } from './user-menu';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function Topbar() {
  return (
    <header className="border-border/80 bg-card/90 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md transition-colors">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1 transition-colors" />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <GlobalSearchDialog />
        <InstitutionalNotifications />
        <Separator orientation="vertical" className="hidden h-4 sm:block" />
        <span className="text-muted-foreground border-border/80 bg-muted/40 hidden items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium select-none xl:inline-flex">
          HVPM COET Amravati
        </span>
        <UserMenu />
      </div>
    </header>
  );
}
