'use client';

import { LockIcon, ShieldAlertIcon } from 'lucide-react';
import * as React from 'react';

import { HvpmLogo } from './hvpm-logo';

/**
 * Refined Institutional Identity Panel for S.P.A.R.K. (Desktop View).
 *
 * Designed in accordance with Microsoft Dynamics 365 / Business Central enterprise
 * principles:
 * - Authoritative institutional navy & deep navy surface (#0B1F33 -> #12345B).
 * - Restrained academic gold accents (#D9A441).
 * - High-contrast, high-DPI official HVPM COET emblem.
 * - Concise institutional governance statement without marketing clutter.
 * - Subtle geometric architectural line texture.
 */
export function AuthBrandPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden border-r border-[#1E3A5F] bg-[#0B1F33] bg-gradient-to-b from-[#0B1F33] via-[#0E2744] to-[#12345B] p-8 text-white select-none lg:flex xl:p-10">
      {/* Subtle architectural geometric grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.035]"
        aria-hidden="true"
      />

      {/* Controlled academic gold accent top bar */}
      <div
        className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-[#D9A441] to-transparent opacity-80"
        aria-hidden="true"
      />

      {/* Top / Center Institutional Brand Content */}
      <div className="relative z-10 space-y-6">
        {/* Real HVPM COET Institutional Emblem in high-contrast frame */}
        <div className="inline-flex rounded-lg border border-[#D9A441]/40 bg-white/95 p-3.5 shadow-sm ring-1 ring-black/5">
          <HvpmLogo
            size="brand"
            className="h-20 w-auto"
            alt="HVPM College of Engineering and Technology emblem"
            priority
          />
        </div>

        {/* Primary Platform & Institutional Identity */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-2xl font-extrabold tracking-wider text-white xl:text-3xl">
                S.P.A.R.K.
              </span>
              <span className="rounded-xs border border-[#D9A441]/40 bg-[#D9A441]/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#F0C068]">
                ERP
              </span>
            </div>
            <p className="mt-1 font-mono text-xs font-medium tracking-wide text-[#E5B555] uppercase">
              Strategic Platform for Analytics, Reports &amp; Knowledgeflow
            </p>
          </div>

          {/* Academic Gold Divider */}
          <div className="h-0.5 w-12 rounded-full bg-[#D9A441]/70" aria-hidden="true" />

          <div className="space-y-1">
            <h2 className="text-sm leading-snug font-semibold text-slate-100 xl:text-base">
              HVPM College of Engineering and Technology, Amravati
            </h2>
            <p className="max-w-sm text-xs leading-relaxed text-slate-300/85">
              Integrated academic and campus administration.
            </p>
          </div>
        </div>

        {/* Institutional Purpose & Scope Note */}
        <div className="max-w-sm rounded-md border border-white/10 bg-white/[0.04] p-3 text-[11px] leading-relaxed text-slate-300/80">
          Centralized institutional operational gateway governing academic workflows, faculty
          records, examination administration, and student lifecycle knowledgeflow.
        </div>
      </div>

      {/* Bottom Institutional Accreditation & Security Tag */}
      <div className="relative z-10 space-y-2 border-t border-white/10 pt-6">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#E5B555]">
          <ShieldAlertIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Restricted Institutional System</span>
        </div>
        <p className="text-[10px] leading-tight text-slate-400/90">
          Authorized personnel only. Access and transactions are monitored in accordance with
          institutional IT security policies.
        </p>
        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400">
          <LockIcon className="size-3 shrink-0 text-slate-400/70" aria-hidden="true" />
          <span>HVPM COET • Established 1999 • SGBAU Affiliated</span>
        </div>
      </div>
    </div>
  );
}
