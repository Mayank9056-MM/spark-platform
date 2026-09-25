'use client';

import { LockIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { AuthBrandPanel } from './auth-brand-panel';
import { AuthFormPanel, type AuthFormPanelProps } from './auth-form-panel';
import { AuthMobileBrand } from './auth-mobile-brand';

import { cn } from '@/lib/utils';

export interface AuthShellProps extends AuthFormPanelProps {
  /** Optional custom left panel replacement */
  leftPanel?: ReactNode;
}

/**
 * Enterprise Authentication Shell for S.P.A.R.K.
 *
 * Implements an intentional responsive architecture inspired by Microsoft Dynamics 365
 * and Fluent design:
 * - Large screens (>= 1024px): Integrated horizontal two-region composition with
 *   authoritative institutional brand panel on left and focused form workspace on right.
 * - Mobile / Tablet (< 1024px): Intelligent vertical reflow with streamlined institutional
 *   header and prioritized authentication surface.
 * - Motion: Smooth, accessible entrance animation respecting reduced-motion settings.
 */
export function AuthShell({
  badge,
  title,
  subtitle,
  institution,
  description,
  children,
  cardFooter,
  leftPanel,
  className,
}: AuthShellProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center py-2 sm:py-6">
      {/* Mobile Streamlined Institutional Brand Header (< 1024px) */}
      <AuthMobileBrand />

      {/* Main Integrated Application Container with subtle entrance transition */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'border-border/90 bg-card w-full max-w-md rounded-lg border shadow-sm transition-colors lg:max-w-4xl xl:max-w-5xl',
          'overflow-hidden lg:grid lg:grid-cols-12',
          className,
        )}
      >
        {/* Desktop Left Region: Refined Institutional Brand Surface */}
        <div className="hidden flex-col lg:col-span-5 lg:flex">
          {leftPanel ?? <AuthBrandPanel />}
        </div>

        {/* Desktop Right / Mobile Primary Task Workspace */}
        <div className="flex flex-col lg:col-span-7">
          <AuthFormPanel
            badge={badge}
            title={title}
            subtitle={subtitle}
            institution={institution}
            description={description}
            cardFooter={cardFooter}
          >
            {children}
          </AuthFormPanel>
        </div>
      </motion.div>

      {/* Subtle Institutional Security Attribution Below Application Container */}
      <div className="mt-4 text-center select-none">
        <p className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
          <LockIcon className="text-muted-foreground/70 size-3" aria-hidden="true" />
          <span>Restricted Operational Network</span>
          <span className="text-muted-foreground/40">•</span>
          <span>HVPM COET S.P.A.R.K.</span>
        </p>
      </div>
    </div>
  );
}
