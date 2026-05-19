"use client";

/**
 * ProposalOSHeader — branded builder header for the Proposal Operating System.
 *
 * Replaces the generic WorkspacePageHero on the proposal builder page.
 * Communicates:
 *   - The "Proposal OS" brand with a dynamic gradient icon
 *   - The currently selected preset (as a colored badge)
 *   - A way to change the preset without losing work
 *   - Customer context if already selected
 */

import { motion } from "framer-motion";
import { Building2, ChevronRight, Home, RefreshCw, Zap } from "lucide-react";
import type { ProposalPresetId } from "@/components/proposals/os/preset-picker";
import { PresenceStack } from "@/components/workspace/presence-stack";

type Props = {
  presetId: ProposalPresetId | null;
  onChangePreset: () => void;
  customerName?: string;
};

const PRESET_META: Record<
  ProposalPresetId,
  {
    icon: React.ReactNode;
    label: string;
    description: string;
    pillClass: string;
    dotClass: string;
  }
> = {
  residential_smart: {
    icon: <Home className="h-4 w-4" />,
    label: "Residential Smart",
    description: "Bill audit · Savings · BOM · AMC",
    pillClass:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-300",
    dotClass: "bg-amber-400",
  },
  commercial_executive: {
    icon: <Building2 className="h-4 w-4" />,
    label: "Commercial Executive",
    description: "Executive summary · Engineering · Financial intelligence",
    pillClass:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-900/20 dark:text-sky-300",
    dotClass: "bg-sky-400",
  },
};

export function ProposalOSHeader({ presetId, onChangePreset, customerName }: Props) {
  const meta = presetId ? PRESET_META[presetId] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      {/* Left: wordmark + preset badge */}
      <div className="flex items-center gap-3">
        {/* Proposal OS icon */}
        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 shadow-md shadow-orange-300/30 dark:shadow-orange-900/40">
          <Zap className="h-5 w-5 text-white" />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-900" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-lg">
              Proposal OS
            </h1>
            {/* Breadcrumb arrow if customer selected */}
            {customerName && (
              <>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <span className="max-w-[140px] truncate text-sm font-semibold text-slate-700 dark:text-slate-300 sm:max-w-[200px]">
                  {customerName}
                </span>
              </>
            )}
          </div>

          {/* Preset badge */}
          {meta ? (
            <div className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.pillClass}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
              {meta.icon}
              <span>{meta.label}</span>
              <span className="text-[10px] font-normal opacity-70">·</span>
              <span className="hidden text-[10px] font-normal opacity-70 sm:inline">{meta.description}</span>
            </div>
          ) : (
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
              No preset selected
            </div>
          )}
        </div>
      </div>

      {/* Right: presence stack + change preset button */}
      <div className="flex self-start items-center gap-3">
        {/* Wave 4 P9 — who else is in the builder */}
        <PresenceStack proposalId="builder" />
        <button
          type="button"
          onClick={onChangePreset}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <RefreshCw className="h-3 w-3" />
          Change preset
        </button>
      </div>
    </motion.div>
  );
}
