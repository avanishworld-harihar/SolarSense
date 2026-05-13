"use client";

import { ProposalHubActionsSheet } from "@/components/proposals/proposal-hub-actions-sheet";
import type { ProposalListCardProps } from "@/components/proposals/proposal-list-card";
import { Button } from "@/components/ui/button";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import { cn } from "@/lib/utils";
import { ArrowRight, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ProposalHubDealRow } from "./proposal-hub-deal-list";

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export function ProposalWorkspacePreview({
  row,
  labels,
  summaryTitle,
  nextActionHint,
  emptyLabel,
  paneEyebrow,
  nextStepLabel
}: {
  row: ProposalHubDealRow | null;
  labels: ProposalListCardProps["labels"];
  summaryTitle: string;
  nextActionHint: string;
  emptyLabel: string;
  /** Shown above customer name in hub split / desktop pane (workflow focus). */
  paneEyebrow?: string;
  /** Label above the next-action copy. */
  nextStepLabel?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!row) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-slate-200/80 bg-slate-50/30 px-6 py-16 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  const st = normalizeProposalStatus(row.proposal_status);
  const manageHref = `/proposals/${row.id}`;
  const savingMo =
    row.annual_saving_inr != null && Number.isFinite(row.annual_saving_inr)
      ? Math.round(row.annual_saving_inr / 12)
      : null;

  return (
    <>
      <div className="flex min-h-0 flex-col">
        <header className="sticky top-0 z-10 -mx-1 border-b border-slate-200/60 bg-white/90 pb-6 pt-1 backdrop-blur-md dark:border-white/[0.07] dark:bg-[#0c1017]/90">
          {paneEyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{paneEyebrow}</p>
          ) : null}
          <h2 className={cn("text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl", paneEyebrow && "mt-2")}>
            {row.customer_name}
          </h2>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">{labels.statusLabel(st)}</span>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden>
              ·
            </span>
            <span>{formatShortDate(row.generated_at)}</span>
          </div>
        </header>

        <section className="mt-8" aria-labelledby="hub-commercial-heading">
          <h3 id="hub-commercial-heading" className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {summaryTitle}
          </h3>
          <div className="mt-4 flex flex-wrap gap-x-10 gap-y-6 border-b border-slate-100 pb-8 dark:border-white/[0.06]">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{labels.kw}</p>
              <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">{row.system_kw}</p>
            </div>
            <div className="min-w-0 max-w-[14rem]">
              <p className="text-xs text-slate-500 dark:text-slate-400">{labels.panelBrand}</p>
              <p className="mt-1.5 truncate text-xl font-semibold text-slate-900 dark:text-slate-50">{row.panel_brand ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{labels.netPayable}</p>
              <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-teal-800 dark:text-teal-200">
                {row.final_amount_inr != null ? `₹${Math.round(row.final_amount_inr).toLocaleString("en-IN")}` : "—"}
              </p>
            </div>
            {savingMo != null ? (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{labels.estSavingMo}</p>
                <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
                  ₹{savingMo.toLocaleString("en-IN")}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-8">
          {nextStepLabel ? (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{nextStepLabel}</p>
          ) : null}
          <p className={cn("max-w-prose text-sm leading-relaxed text-slate-600 dark:text-slate-400", nextStepLabel && "mt-2")}>
            {nextActionHint}
          </p>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-2">
          <Button asChild type="button" size="lg" variant="default" className="min-h-11 flex-1 gap-2 font-semibold sm:flex-none sm:min-w-[200px]">
            <Link href={manageHref}>
              {labels.openWorkspace}
              <ArrowRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            </Link>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-11 w-11 shrink-0 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]"
            aria-label={labels.moreActions}
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </div>

      <ProposalHubActionsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        proposalId={row.id}
        labels={labels}
        annualSavingInr={row.annual_saving_inr}
      />
    </>
  );
}
