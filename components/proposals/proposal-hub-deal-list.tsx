"use client";

import { ProposalStatusBadge } from "@/components/proposal-status-badge";
import { normalizeProposalStatus, PROPOSAL_STATUS_ORDER, type ProposalStatus } from "@/lib/proposal-status";
import { cn } from "@/lib/utils";

export type ProposalHubDealRow = {
  id: string;
  customer_name: string;
  generated_at: string;
  system_kw: number;
  final_amount_inr: number | null;
  panel_brand: string | null;
  annual_saving_inr: number | null;
  proposal_status: string;
};

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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
  className
}: {
  rows: ProposalHubDealRow[];
  focusId: string | null;
  onSelect: (id: string) => void;
  statusLabel: (s: ProposalStatus) => string;
  groupCountLabel: (n: number) => string;
  pipelineLabel: string;
  className?: string;
}) {
  const grouped = groupRows(rows);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-[#0c1017]",
        className
      )}
    >
      <div className="shrink-0 border-b border-slate-100 px-3 py-2 dark:border-white/[0.06]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{pipelineLabel}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
        {PROPOSAL_STATUS_ORDER.map((st) => {
          const bucket = grouped.get(st) ?? [];
          if (bucket.length === 0) return null;
          return (
            <div key={st} className="border-b border-slate-100 last:border-b-0 dark:border-white/[0.06]">
              <div className="sticky top-0 z-[1] flex items-baseline justify-between gap-2 bg-slate-50/95 px-3 py-2 backdrop-blur-sm dark:bg-[#11161d]/95">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{statusLabel(st)}</span>
                <span className="text-[10px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                  {groupCountLabel(bucket.length)}
                </span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]" role="list">
                {bucket.map((row) => {
                  const active = row.id === focusId;
                  const rowSt = normalizeProposalStatus(row.proposal_status);
                  const amt =
                    row.final_amount_inr != null ? `₹${Math.round(row.final_amount_inr).toLocaleString("en-IN")}` : "—";
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(row.id)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors",
                          active
                            ? "border-l-[3px] border-l-teal-600 bg-teal-50/95 ring-1 ring-inset ring-teal-400/30 dark:border-l-teal-400 dark:bg-teal-950/35 dark:ring-teal-400/20"
                            : "hover:bg-slate-50/90 dark:hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{row.customer_name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <ProposalStatusBadge status={rowSt} label={statusLabel(rowSt)} className="scale-90 origin-left" />
                            <span className="text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                              {row.system_kw} kW
                            </span>
                          </div>
                        </div>
                        <div className="hidden shrink-0 text-right sm:block">
                          <p className="text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">{amt}</p>
                          <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">{formatShortDate(row.generated_at)}</p>
                        </div>
                        <div className="shrink-0 text-right sm:hidden">
                          <p className="text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">{amt}</p>
                        </div>
                      </button>
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
