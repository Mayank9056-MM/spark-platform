'use client';

import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useAuth } from '@/features/auth';
import { hasRole } from '@/features/rbac';

function toLabel(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Derived straight from the URL under /app — no per-page config to keep in sync. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const { roles } = useAuth();
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .filter((segment) => segment !== 'app');

  if (segments.length === 0) {
    return null;
  }

  // Build up (segment, href) pairs without mutating anything during render.
  const crumbs = segments.reduce<{ segment: string; href: string }[]>((acc, segment) => {
    const previousHref = acc.length > 0 ? acc[acc.length - 1].href : '/app';
    acc.push({ segment, href: `${previousHref}/${segment}` });
    return acc;
  }, []);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map(({ segment, href }, index) => {
          const isLast = index === crumbs.length - 1;
          const isRestrictedForRole = href === '/app/student' && !hasRole(roles, 'student');
          return (
            <Fragment key={href}>
              <BreadcrumbItem>
                {isLast || isRestrictedForRole ? (
                  <BreadcrumbPage>{toLabel(segment)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{toLabel(segment)}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
