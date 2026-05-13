"use client";

import type { ProposalStatus } from "@/lib/proposal-status";
import { cn } from "@/lib/utils";

const tone: Record<ProposalStatus, string> = {
  draft: "border-slate-300/80 bg-slate-100/90 text-slate-700 dark:border-white/15 dark:bg-white/[0.08] dark:text-slate-200",
  sent: "border-sky-300/80 bg-sky-50/95 text-sky-900 dark:border-sky-500/35 dark:bg-sky-950/40 dark:text-sky-100",
  viewed: "border-violet-300/80 bg-violet-50/95 text-violet-900 dark:border-violet-500/35 dark:bg-violet-950/40 dark:text-violet-100",
  negotiation: "border-amber-300/80 bg-amber-50/95 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-100",
  approved: "border-emerald-300/80 bg-emerald-50/95 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/40 dark:text-emerald-100"
};

export function ProposalStatusBadge({
  status,
  label,
  className
}: {
  status: ProposalStatus;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
        tone[status],
        className
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
