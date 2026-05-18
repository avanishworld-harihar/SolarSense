"use client";

/**
 * HubSearchFilter — search input + status filter chip bar for /proposals.
 *
 * Stateless — parent owns the query and activeStatus state.
 * Lightweight: no external deps, pure Tailwind.
 */

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROPOSAL_STATUS_ORDER, type ProposalStatus } from "@/lib/proposal-status";
import { statusVisualLight } from "@/lib/proposal-hub-insights";

const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  negotiation: "Negotiation",
  approved: "Won",
};

export function HubSearchFilter({
  query,
  onQueryChange,
  activeStatus,
  onStatusChange,
  resultCount,
  className,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  activeStatus: ProposalStatus | null;
  onStatusChange: (s: ProposalStatus | null) => void;
  resultCount?: number;
  className?: string;
}) {
  const hasFilter = !!query || activeStatus !== null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Search input */}
      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
          aria-hidden
          strokeWidth={2.25}
        />
        <input
          type="search"
          placeholder="Search proposals, customers, kW…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className={cn(
            "w-full rounded-xl border bg-white py-2.5 pl-9 pr-9 text-sm font-medium",
            "border-slate-200/80 text-slate-800 placeholder:text-slate-400",
            "focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20",
            "dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500",
            "dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
          )}
          aria-label="Search proposals"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-3 rounded-md p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {/* "All" chip */}
        <button
          type="button"
          onClick={() => onStatusChange(null)}
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold transition-all",
            activeStatus === null
              ? "border-teal-400/60 bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
              : "border-slate-200/80 bg-white text-slate-500 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
          )}
        >
          All
          {resultCount !== undefined && (
            <span className="ml-1.5 rounded-full bg-slate-200/80 px-1.5 text-[10px] font-black tabular-nums dark:bg-white/10">
              {resultCount}
            </span>
          )}
        </button>

        {PROPOSAL_STATUS_ORDER.map((st) => {
          const vis = statusVisualLight(st);
          const active = activeStatus === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => onStatusChange(active ? null : st)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-all",
                active
                  ? cn("border", vis.border, vis.bg, vis.text)
                  : "border-slate-200/80 bg-white text-slate-500 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-white/20"
              )}
              aria-pressed={active}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", active ? vis.dot : "bg-slate-300 dark:bg-slate-600")} aria-hidden />
              {STATUS_LABELS[st]}
            </button>
          );
        })}

        {/* Clear filters */}
        {hasFilter && (
          <button
            type="button"
            onClick={() => { onQueryChange(""); onStatusChange(null); }}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
