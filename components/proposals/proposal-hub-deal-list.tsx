"use client";

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
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-transparent", className)}>
      <div className="shrink-0 pb-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{pipelineLabel}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
        {PROPOSAL_STATUS_ORDER.map((st) => {
          const bucket = grouped.get(st) ?? [];
          if (bucket.length === 0) return null;
          return (
            <div key={st} className="border-t border-slate-200/60 first:border-t-0 dark:border-white/[0.06]">
              <div className="sticky top-0 z-[1] flex items-baseline justify-between gap-2 bg-white/90 py-2.5 backdrop-blur-sm dark:bg-[#0c1017]/90">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {statusLabel(st)}
                </span>
                <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">{groupCountLabel(bucket.length)}</span>
              </div>
              <ul className="space-y-px" role="list">
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
                          "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
                          active
                            ? "bg-slate-100/95 dark:bg-white/[0.06]"
                            : "hover:bg-slate-50/90 dark:hover:bg-white/[0.03]"
                        )}
                      >
                        <span
                          className={cn(
                            "h-8 w-0.5 shrink-0 rounded-full transition-colors",
                            active ? "bg-teal-600 dark:bg-teal-400" : "bg-transparent"
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium leading-snug text-slate-900 dark:text-slate-100">
                            {row.customer_name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {statusLabel(rowSt)}
                            <span className="text-slate-300 dark:text-slate-600"> · </span>
                            {row.system_kw} kW
                          </p>
                        </div>
                        <div className="hidden shrink-0 text-right sm:block">
                          <p className="text-[13px] font-medium tabular-nums text-slate-800 dark:text-slate-100">{amt}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{formatShortDate(row.generated_at)}</p>
                        </div>
                        <div className="shrink-0 text-right sm:hidden">
                          <p className="text-[12px] font-medium tabular-nums text-slate-800 dark:text-slate-100">{amt}</p>
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
