"use client";

/**
 * ProposalLivePreviewPanel — sticky right-sidebar live preview for the proposal builder.
 *
 * Shows the current proposal state in real-time as the user fills in the form:
 *   - Preset badge + customer name
 *   - 4 key metrics (system kW, annual saving, net cost, payback)
 *   - Block playlist chips (which sections will be in the proposal)
 *   - Generate CTA
 *   - "Edit blocks" link to open the BlockPlaylistEditor
 *
 * Sits to the right of the builder form on desktop (xl+ viewport).
 * Fully reactive — reads from parent state via props.
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Globe,
  Home,
  LayoutList,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { ProposalPresetId } from "@/components/proposals/os/preset-picker";

// ─── Block playlist chip data ─────────────────────────────────────────────────

type BlockChip = { id: string; label: string; isCommercial?: boolean };

const RESIDENTIAL_CHIPS: BlockChip[] = [
  { id: "cover", label: "Cover" },
  { id: "about", label: "Company" },
  { id: "bill-audit", label: "Bill Audit" },
  { id: "economics", label: "Savings" },
  { id: "environment", label: "Environment" },
  { id: "technical", label: "Technical" },
  { id: "bom", label: "BOM" },
  { id: "amc", label: "AMC" },
  { id: "payment", label: "Payment" },
  { id: "closing", label: "Closing" },
];

const COMMERCIAL_CHIPS: BlockChip[] = [
  { id: "cover", label: "Cover" },
  { id: "exec", label: "Executive Summary", isCommercial: true },
  { id: "system", label: "System Design" },
  { id: "financial", label: "Financial Intelligence", isCommercial: true },
  { id: "engineering", label: "Engineering", isCommercial: true },
  { id: "technical", label: "Technical" },
  { id: "bom", label: "BOM" },
  { id: "amc", label: "AMC" },
  { id: "payment", label: "Payment" },
  { id: "closing", label: "Closing" },
];

const NO_BILL_CHIPS: BlockChip[] = RESIDENTIAL_CHIPS.map((c) =>
  c.id === "bill-audit"
    ? { ...c, id: "system-req", label: "System Req." }
    : c.id === "economics"
      ? null
      : c
).filter((c): c is BlockChip => c !== null);

// ─── Metric tile ──────────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-base font-extrabold tabular-nums leading-tight ${
          accent
            ? "text-indigo-700 dark:text-indigo-300"
            : "text-slate-900 dark:text-slate-50"
        }`}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  presetId: ProposalPresetId | null;
  customerName: string;
  city?: string;
  systemKw: number;
  annualSaving: number;
  netCost: number;
  paybackLabel: string;
  isBillBacked: boolean;
  latestProposalUrl: string | null;
  onGenerate: () => void;
  busy: boolean;
  onEditBlocks: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ProposalLivePreviewPanel({
  presetId,
  customerName,
  city,
  systemKw,
  annualSaving,
  netCost,
  paybackLabel,
  isBillBacked,
  latestProposalUrl,
  onGenerate,
  busy,
  onEditBlocks,
}: Props) {
  const isCommercial = presetId === "commercial_executive";

  const chips =
    isCommercial
      ? COMMERCIAL_CHIPS
      : isBillBacked
        ? RESIDENTIAL_CHIPS
        : NO_BILL_CHIPS;

  const hasCustomer = Boolean(customerName);
  const hasMetrics = systemKw > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-20 flex flex-col gap-3"
    >
      {/* Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_4px_32px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/90">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Live Preview
            </span>
          </div>
          {/* Preset pill */}
          {presetId && (
            <div
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isCommercial
                  ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              {isCommercial ? (
                <Building2 className="h-2.5 w-2.5" />
              ) : (
                <Home className="h-2.5 w-2.5" />
              )}
              {isCommercial ? "Commercial" : "Residential"}
            </div>
          )}
        </div>

        <div className="p-4">
          {/* Customer name */}
          <AnimatePresence mode="wait">
            {hasCustomer ? (
              <motion.div
                key="customer-filled"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-3"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
                    {customerName}
                  </p>
                </div>
                {city && (
                  <p className="ml-5 text-[11px] text-slate-500 dark:text-slate-400">{city}</p>
                )}
              </motion.div>
            ) : (
              <motion.p
                key="customer-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-3 text-xs text-slate-400 dark:text-slate-500"
              >
                Enter customer name to get started
              </motion.p>
            )}
          </AnimatePresence>

          {/* Metrics grid */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <MetricTile
              label="System"
              value={hasMetrics ? `${systemKw} kW` : "—"}
              accent={hasMetrics}
            />
            <MetricTile
              label="Annual Saving"
              value={
                annualSaving > 0
                  ? `₹${Math.round(annualSaving).toLocaleString("en-IN")}`
                  : "—"
              }
            />
            <MetricTile
              label="Net Cost"
              value={
                netCost > 0
                  ? `₹${Math.round(netCost).toLocaleString("en-IN")}`
                  : "—"
              }
            />
            <MetricTile
              label="Payback"
              value={systemKw > 0 ? paybackLabel : "—"}
            />
          </div>

          {/* Bill backed badge */}
          <div className={`mb-3 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${
            isBillBacked
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          }`}>
            {isBillBacked ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Bill-backed — full audit included
              </>
            ) : (
              <>
                <TrendingUp className="h-3 w-3" />
                Requirement-based — no bill
              </>
            )}
          </div>

          {/* Block playlist */}
          <div className="mb-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Proposal Blocks
              </p>
              <button
                type="button"
                onClick={onEditBlocks}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <LayoutList className="h-3 w-3" />
                Edit
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {chips.map((chip) => (
                <span
                  key={chip.id}
                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    chip.isCommercial
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {chip.isCommercial && (
                    <Building2 className="mr-0.5 h-2 w-2" />
                  )}
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={onGenerate}
            disabled={busy || !hasCustomer}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              hasCustomer && !busy
                ? "bg-slate-900 text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                : "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
            }`}
          >
            <Globe className="h-4 w-4" />
            {busy ? "Generating…" : "Generate Proposal"}
          </button>

          {/* Open existing link */}
          {latestProposalUrl && (
            <a
              href={latestProposalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-400"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Open latest proposal
            </a>
          )}
        </div>
      </div>

      {/* Bottom hint */}
      <p className="px-1 text-center text-[10px] text-slate-400 dark:text-slate-600">
        Preview updates in real-time as you build
      </p>
    </motion.div>
  );
}
