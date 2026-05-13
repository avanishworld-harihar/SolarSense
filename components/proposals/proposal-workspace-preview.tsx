"use client";

import { ProposalHubActionsSheet } from "@/components/proposals/proposal-hub-actions-sheet";
import type { ProposalListCardProps } from "@/components/proposals/proposal-list-card";
import { ProposalStatusBadge } from "@/components/proposal-status-badge";
import { Button } from "@/components/ui/button";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import { ExternalLink, MoreHorizontal } from "lucide-react";
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
  emptyLabel
}: {
  row: ProposalHubDealRow | null;
  labels: ProposalListCardProps["labels"];
  summaryTitle: string;
  nextActionHint: string;
  emptyLabel: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!row) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200/90 bg-slate-50/40 px-4 py-10 text-center text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
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
      <section className="flex min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-[#0c1017] sm:p-5">
        <div className="min-w-0 border-b border-slate-100 pb-4 dark:border-white/[0.06]">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">{row.customer_name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ProposalStatusBadge status={st} label={labels.statusLabel(st)} />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatShortDate(row.generated_at)}</span>
          </div>
        </div>

        <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{summaryTitle}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{labels.kw}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-slate-900 dark:text-slate-100">{row.system_kw}</dd>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{labels.panelBrand}</dt>
            <dd className="mt-0.5 truncate font-semibold text-slate-900 dark:text-slate-100">{row.panel_brand ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{labels.netPayable}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-teal-800 dark:text-emerald-300">
              {row.final_amount_inr != null ? `₹${Math.round(row.final_amount_inr).toLocaleString("en-IN")}` : "—"}
            </dd>
          </div>
          {savingMo != null ? (
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{labels.estSavingMo}</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-slate-900 dark:text-slate-100">₹{savingMo.toLocaleString("en-IN")}</dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{nextActionHint}</p>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
          <Button asChild type="button" size="lg" variant="emeraldCta" className="min-h-11 flex-1 touch-manipulation gap-2 font-semibold sm:flex-none sm:px-6">
            <Link href={manageHref}>
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              {labels.openWorkspace}
            </Link>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="min-h-11 shrink-0 touch-manipulation px-4 font-semibold"
            aria-label={labels.moreActions}
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            <MoreHorizontal className="h-5 w-5 sm:mr-1" aria-hidden />
            <span className="hidden sm:inline">{labels.moreActions}</span>
          </Button>
        </div>
      </section>

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
