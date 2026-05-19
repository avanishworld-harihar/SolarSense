"use client";

/**
 * BlockPlaylistEditor — slide-out drawer for managing proposal block playlist.
 *
 * Shows all available proposal sections with toggles and descriptions.
 * Commercial-only blocks are clearly badged.
 * Changes are local to the session (visual only in Phase B — future phases
 * will persist to the ProposalDocument.layout).
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  Home,
  Lock,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ProposalPresetId } from "@/components/proposals/os/preset-picker";

type BlockDef = {
  id: string;
  label: string;
  description: string;
  defaultOn: boolean;
  commercialOnly?: boolean;
  residentialOnly?: boolean;
  alwaysOn?: boolean;
};

const ALL_BLOCKS: BlockDef[] = [
  {
    id: "cover_page",
    label: "Cover Page",
    description: "Customer name, installer branding, system kW headline.",
    defaultOn: true,
    alwaysOn: true,
  },
  {
    id: "about_company",
    label: "Company Profile",
    description: "Installer expertise, verticals, and project portfolio.",
    defaultOn: true,
  },
  {
    id: "executive_summary",
    label: "Executive Summary",
    description: "High-impact commercial lead: ROI, payback, and why-solar-now.",
    defaultOn: true,
    commercialOnly: true,
  },
  {
    id: "bill_audit",
    label: "Bill Audit",
    description: "Deep-dive into monthly electricity bills and cost breakdown.",
    defaultOn: true,
    residentialOnly: true,
  },
  {
    id: "system_requirements",
    label: "System Requirements",
    description: "System sizing, generation profile, and coverage percentage.",
    defaultOn: true,
  },
  {
    id: "roi_savings",
    label: "Savings & Economics",
    description: "Year-wise savings chart, EMI calculator, and 25-year projection.",
    defaultOn: true,
    residentialOnly: true,
  },
  {
    id: "payback_analysis",
    label: "Financial Intelligence",
    description: "NPV, IRR, cashflow table, and break-even visualization.",
    defaultOn: true,
    commercialOnly: true,
  },
  {
    id: "engineering_rationale",
    label: "Engineering Rationale",
    description: "DC/AC ratio, performance ratio, certifications, and installation workflow.",
    defaultOn: true,
    commercialOnly: true,
  },
  {
    id: "environment",
    label: "Environment Impact",
    description: "Carbon offset, tree-planting equivalence, and green credentials.",
    defaultOn: true,
  },
  {
    id: "technical_bom",
    label: "Technical + BOM",
    description: "Component specifications, bill of materials, and quantity table.",
    defaultOn: true,
  },
  {
    id: "amc",
    label: "AMC & Service",
    description: "Annual maintenance contract terms, service schedule, and support.",
    defaultOn: true,
  },
  {
    id: "payment",
    label: "Payment Terms",
    description: "Payment milestones, subsidy process, and commercial terms.",
    defaultOn: true,
  },
  {
    id: "closing",
    label: "Closing & Banking",
    description: "Bank details, QR code, and call-to-action for the customer.",
    defaultOn: true,
    alwaysOn: true,
  },
];

type Props = {
  presetId: ProposalPresetId | null;
  onClose: () => void;
};

export function BlockPlaylistEditor({ presetId, onClose }: Props) {
  const isCommercial = presetId === "commercial_executive";

  // Determine which blocks are visible for this preset
  const visibleBlocks = ALL_BLOCKS.filter((b) => {
    if (b.commercialOnly && !isCommercial) return false;
    if (b.residentialOnly && isCommercial) return false;
    return true;
  });

  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(visibleBlocks.map((b) => [b.id, b.defaultOn]))
  );

  function toggle(id: string) {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="playlist-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="proposal-os-glass-backdrop fixed inset-0 z-[10040]"
      />

      {/* Drawer */}
        <motion.div
          key="playlist-drawer"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="proposal-os-glass-drawer fixed inset-y-0 right-0 z-[10050] flex w-full max-w-sm flex-col overflow-hidden shadow-2xl max-lg:max-h-[100dvh]"
        >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">
              Proposal Blocks
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {enabledCount} of {visibleBlocks.length} sections enabled
              {presetId && (
                <span className={`ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  isCommercial
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                }`}>
                  {isCommercial ? <Building2 className="h-2.5 w-2.5" /> : <Home className="h-2.5 w-2.5" />}
                  {isCommercial ? "Commercial" : "Residential"}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Block list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
            Sections in this proposal
          </p>

          <div className="flex flex-col gap-2">
            {visibleBlocks.map((block, i) => {
              const isOn = enabled[block.id] ?? block.defaultOn;
              const isLocked = block.alwaysOn;

              return (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
                    isOn
                      ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60"
                      : "border-dashed border-slate-200/70 bg-slate-50/50 opacity-60 dark:border-slate-700/50 dark:bg-slate-800/20"
                  }`}
                >
                  {/* Toggle / lock */}
                  <div className="mt-0.5 flex-shrink-0">
                    {isLocked ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                        <Lock className="h-2.5 w-2.5 text-slate-400" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggle(block.id)}
                        className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                          isOn
                            ? "border-emerald-300 bg-emerald-100 text-emerald-600 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : "border-slate-300 bg-white text-slate-300 dark:border-slate-600 dark:bg-slate-800"
                        }`}
                      >
                        {isOn && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Block info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className={`text-xs font-semibold ${isOn ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-600"}`}>
                        {block.label}
                      </p>
                      {block.commercialOnly && (
                        <span className="inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
                          <Building2 className="h-2 w-2" />
                          COM
                        </span>
                      )}
                      {block.alwaysOn && (
                        <span className="inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-500">
                      {block.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Done
          </button>
          <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-600">
            Block order persists with your proposal preset
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
