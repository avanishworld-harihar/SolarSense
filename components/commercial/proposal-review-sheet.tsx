"use client";

/**
 * PHASE E — Review & Customize Proposal
 * Local block toggle + reorder sheet that works without a saved proposalId.
 * Uses the current proposalLayout from parent state.
 * Groups blocks by category and renders smooth ON/OFF controls.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Eye,
  X,
  LayoutGrid,
  BarChart3,
  FileText,
  Shield,
  Image,
  Wrench,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import { PROPOSAL_BLOCK_REGISTRY, type ProposalBlockId, type ProposalBlockGroup } from "@/lib/proposal-block-registry";
import type { ProposalPresetId } from "@/lib/proposal-preset-engine";
import { cn } from "@/lib/utils";

// ─── Group metadata ───────────────────────────────────────────────────────────

const GROUP_META: Record<
  ProposalBlockGroup,
  { label: string; icon: React.ElementType; color: string }
> = {
  intro: {
    label: "Introduction",
    icon: FileText,
    color: "text-indigo-600 bg-indigo-50",
  },
  technical: {
    label: "Technical",
    icon: Wrench,
    color: "text-sky-600 bg-sky-50",
  },
  commercial: {
    label: "Commercial",
    icon: BarChart3,
    color: "text-emerald-600 bg-emerald-50",
  },
  legal: {
    label: "Legal",
    icon: Shield,
    color: "text-slate-600 bg-slate-100",
  },
  media: {
    label: "Media",
    icon: Image,
    color: "text-violet-600 bg-violet-50",
  },
  service: {
    label: "Service",
    icon: Wrench,
    color: "text-amber-600 bg-amber-50",
  },
};

// Human-readable label for each block (fallback to labelKey camelCase)
const BLOCK_DISPLAY_LABELS: Partial<Record<ProposalBlockId, string>> = {
  cover_page: "Cover Page",
  about_company: "About Company",
  executive_summary: "Executive Summary",
  technical_proposal: "Technical Proposal",
  system_requirements: "System Requirements",
  technical_specifications: "Technical Specifications",
  bom_material_list: "Bill of Materials",
  financial_summary: "Financial Summary",
  roi_savings: "ROI & Savings",
  payback_analysis: "Payback Analysis",
  warranty: "Warranty",
  payment_terms: "Payment Terms",
  terms_conditions: "Terms & Conditions",
  project_gallery: "Project Gallery",
  customer_documents_required: "Customer Documents",
  amc_maintenance: "AMC / Maintenance",
  brand_comparison_card: "Brand Comparison",
  dcr_comparison_card: "DCR vs Non-DCR",
  capacity_scenarios_card: "Capacity Scenarios",
  commercial_financing_card: "Financing / EMI",
};

const BLOCK_HINTS: Partial<Record<ProposalBlockId, string>> = {
  executive_summary: "One-page C-suite impact brief",
  system_requirements: "Shows when no bill uploaded",
  dcr_comparison_card: "Side-by-side subsidy cost table",
  capacity_scenarios_card: "50/60/70 kW comparison cards",
  commercial_financing_card: "EMI table with tenures",
  brand_comparison_card: "Panel & inverter brand specs",
  payback_analysis: "NPV / IRR cashflow table",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
  proposalId?: string;
  presetId: ProposalPresetId;
  layout: ProposalTemplateV1;
  onLayoutChange: (layout: ProposalTemplateV1) => void;
  onConfirm?: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ProposalReviewSheet({
  open,
  onClose,
  layout,
  onLayoutChange,
  onConfirm,
}: Props) {
  const [openGroups, setOpenGroups] = useState<Set<ProposalBlockGroup>>(
    new Set(["intro", "technical", "commercial"])
  );

  const enabledCount = layout.blocks.filter((b) => b.enabled).length;
  const totalCount = layout.blocks.length;

  function toggleBlock(id: ProposalBlockId) {
    onLayoutChange({
      ...layout,
      blocks: layout.blocks.map((b) =>
        b.id === id ? { ...b, enabled: !b.enabled } : b
      ),
    });
  }

  function toggleGroup(group: ProposalBlockGroup) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  // Group blocks preserving layout order
  const grouped = (() => {
    const map = new Map<ProposalBlockGroup, typeof layout.blocks>();
    for (const b of layout.blocks) {
      const meta = PROPOSAL_BLOCK_REGISTRY[b.id];
      if (!meta) continue;
      const g = meta.group;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(b);
    }
    return map;
  })();

  const groupOrder: ProposalBlockGroup[] = ["intro", "technical", "commercial", "legal", "media", "service"];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[201] flex max-h-[88dvh] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0c1017]"
          >
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-white/8">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
                  <LayoutGrid className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Review Proposal</p>
                  <p className="text-[11px] text-slate-500">
                    {enabledCount} of {totalCount} sections active · tap to toggle
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Completion pill */}
                <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 sm:flex">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span className="text-[11px] font-bold text-emerald-700">
                    {Math.round((enabledCount / totalCount) * 100)}% complete
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 w-full bg-slate-100 dark:bg-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${(enabledCount / totalCount) * 100}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {groupOrder.map((group) => {
                const blocks = grouped.get(group);
                if (!blocks || blocks.length === 0) return null;
                const gMeta = GROUP_META[group];
                const Icon = gMeta.icon;
                const isOpen = openGroups.has(group);
                const enabledInGroup = blocks.filter((b) => b.enabled).length;

                return (
                  <div
                    key={group}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 dark:border-white/8 dark:bg-white/[0.02]"
                  >
                    {/* Group header */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
                    >
                      <div className={cn("flex h-6 w-6 items-center justify-center rounded-lg text-xs", gMeta.color)}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="flex-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                        {gMeta.label}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {enabledInGroup}/{blocks.length} on
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 text-slate-400 transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {/* Block rows */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.15, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-100 bg-white divide-y divide-slate-50 dark:border-white/5 dark:bg-transparent">
                            {blocks.map((b) => {
                              const label = BLOCK_DISPLAY_LABELS[b.id] ?? b.id;
                              const hint = BLOCK_HINTS[b.id];
                              return (
                                <div
                                  key={b.id}
                                  className="flex items-center gap-3 px-3 py-2.5"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={cn(
                                        "text-[12px] font-semibold transition-colors",
                                        b.enabled ? "text-slate-900 dark:text-white" : "text-slate-400"
                                      )}
                                    >
                                      {label}
                                    </p>
                                    {hint && (
                                      <p className="text-[10px] text-slate-400">{hint}</p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={b.enabled}
                                    onClick={() => toggleBlock(b.id)}
                                    className={cn(
                                      "relative h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                                      b.enabled ? "bg-sky-500" : "bg-slate-300 dark:bg-white/20"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                                        b.enabled ? "translate-x-4" : "translate-x-0.5"
                                      )}
                                    />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-slate-100 p-4 dark:border-white/8">
              <button
                type="button"
                onClick={() => {
                  onConfirm?.();
                  onClose();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md transition hover:from-sky-500 hover:to-indigo-500"
              >
                <Eye className="h-4 w-4" />
                Confirm · {enabledCount} sections
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
