"use client";

import { avatarHue, customerInitials, statusVisual, type ProposalHubRow } from "@/lib/proposal-hub-insights";

export type ProposalHubDealRow = ProposalHubRow;
import { normalizeProposalStatus, PROPOSAL_STATUS_ORDER, type ProposalStatus } from "@/lib/proposal-status";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

function groupRows(rows: ProposalHubDealRow[]): Map<ProposalStatus, ProposalHubDealRow[]> {
  const map = new Map<ProposalStatus, ProposalHubDealRow[]>();
  for (const s of PROPOSAL_STATUS_ORDER) map.set(s, []);
  for (const row of rows) {
    const st = normalizeProposalStatus(row.proposal_status);
    map.get(st)?.push(row);
  }
  return map;
}

export function ProposalHubDealList({
  rows,
  focusId,
  onSelect,
  statusLabel,
  groupCountLabel,
  pipelineLabel,
  className,
  showVersionTag = false
}: {
  rows: ProposalHubDealRow[];
  focusId: string | null;
  onSelect: (id: string) => void;
  statusLabel: (s: ProposalStatus) => string;
  groupCountLabel: (n: number) => string;
  pipelineLabel: string;
  className?: string;
  /** When true, show short id so duplicate test rows are distinguishable */
  showVersionTag?: boolean;
}) {
  const grouped = groupRows(rows);
  const reduced = useReducedMotion();

  return (
    <div className={cn("proposal-hub-list flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <div className="proposal-hub-list-head shrink-0 pb-3">
        <p className="proposal-hub-text-muted text-[10px] font-bold uppercase tracking-[0.18em]">{pipelineLabel}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2 [-webkit-overflow-scrolling:touch]">
        {PROPOSAL_STATUS_ORDER.map((st) => {
          const bucket = grouped.get(st) ?? [];
          if (bucket.length === 0) return null;
          const vis = statusVisual(st);
          return (
            <div key={st} className="proposal-hub-list-group">
              <div className="proposal-hub-list-group-head sticky top-0 z-[2] flex items-center justify-between gap-2 py-2.5">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", vis.pillClass)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", vis.dotClass)} aria-hidden />
                  {statusLabel(st)}
                </span>
                <span className="proposal-hub-text-muted text-[10px] tabular-nums">{groupCountLabel(bucket.length)}</span>
              </div>
              <ul className="space-y-1.5" role="list">
                {bucket.map((row, i) => {
                  const active = row.id === focusId;
                  const rowSt = normalizeProposalStatus(row.proposal_status);
                  const rowVis = statusVisual(rowSt);
                  const amt =
                    row.final_amount_inr != null ? `₹${Math.round(row.final_amount_inr).toLocaleString("en-IN")}` : "—";
                  const hue = avatarHue(row.customer_name);
                  const initials = customerInitials(row.customer_name);
                  return (
                    <li key={row.id}>
                      <motion.button
                        type="button"
                        onClick={() => onSelect(row.id)}
                        aria-current={active ? "true" : undefined}
                        initial={reduced ? false : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.03 }}
                        whileHover={reduced ? undefined : { scale: 1.01 }}
                        whileTap={reduced ? undefined : { scale: 0.99 }}
                        className={cn(
                          "proposal-hub-deal-row flex w-full items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left transition-shadow",
                          active && "proposal-hub-deal-row--active"
                        )}
                      >
                        <span
                          className="proposal-hub-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-inner"
                          style={{
                            background: `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 50% 32%))`
                          }}
                          aria-hidden
                        >
                          {initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="proposal-hub-text-primary truncate text-[13px] font-semibold leading-snug sm:text-sm">{row.customer_name}</p>
                          <p className="proposal-hub-text-muted mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px]">
                            <span>{row.system_kw} kW</span>
                            <span className="proposal-hub-text-secondary">·</span>
                            <span className="truncate">{formatShortDate(row.generated_at)}</span>
                            {showVersionTag ? (
                              <>
                                <span className="proposal-hub-text-secondary">·</span>
                                <span className="font-mono text-[10px] opacity-70">{row.id.slice(0, 8)}</span>
                              </>
                            ) : null}
                          </p>
                        </div>
                        <div className="hidden shrink-0 flex-col items-end sm:flex">
                          <p className="proposal-hub-text-primary text-[13px] font-semibold tabular-nums">{amt}</p>
                          <span
                            className={cn(
                              "mt-1 h-0.5 w-8 rounded-full bg-gradient-to-r",
                              rowVis.barClass,
                              active && "w-12 opacity-100"
                            )}
                            aria-hidden
                          />
                        </div>
                        <div className="shrink-0 text-right sm:hidden">
                          <p className="proposal-hub-text-primary text-[12px] font-semibold tabular-nums">{amt}</p>
                        </div>
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
