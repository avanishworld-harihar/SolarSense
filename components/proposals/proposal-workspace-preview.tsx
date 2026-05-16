"use client";

import { ProposalHubActionsSheet } from "@/components/proposals/proposal-hub-actions-sheet";
import { ProposalHubIntelPanel } from "@/components/proposals/proposal-hub-intel-panel";
import type { ProposalListCardProps } from "@/components/proposals/proposal-list-card";
import { Button } from "@/components/ui/button";
import { hubNextActionHint, statusProgressPct, statusVisual } from "@/lib/proposal-hub-insights";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ExternalLink, MessageCircle, MoreHorizontal, PencilLine } from "lucide-react";
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
  nextStepLabel,
  lang = "en",
  intelTitle = "Recommended next"
}: {
  row: ProposalHubDealRow | null;
  labels: ProposalListCardProps["labels"];
  summaryTitle: string;
  nextActionHint: string;
  emptyLabel: string;
  paneEyebrow?: string;
  nextStepLabel?: string;
  lang?: "en" | "hi";
  intelTitle?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const reduced = useReducedMotion();

  if (!row) {
    return (
      <div className="proposal-hub-workspace-empty flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center">
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      </div>
    );
  }

  const st = normalizeProposalStatus(row.proposal_status);
  const vis = statusVisual(st);
  const manageHref = `/proposals/${row.id}`;
  const publicHref = `/proposal/${row.id}`;
  const savingMo =
    row.annual_saving_inr != null && Number.isFinite(row.annual_saving_inr)
      ? Math.round(row.annual_saving_inr / 12)
      : null;
  const pct = statusProgressPct(st);
  const dynamicHint = hubNextActionHint(st, lang);

  const metrics = [
    { label: labels.kw, value: `${row.system_kw}`, accent: false },
    { label: labels.netPayable, value: row.final_amount_inr != null ? `₹${Math.round(row.final_amount_inr).toLocaleString("en-IN")}` : "—", accent: true },
    ...(savingMo != null
      ? [{ label: labels.estSavingMo, value: `₹${savingMo.toLocaleString("en-IN")}`, accent: false }]
      : []),
    { label: labels.panelBrand, value: row.panel_brand ?? "—", accent: false, wide: true }
  ];

  return (
    <>
      <div className="proposal-hub-workspace flex min-h-0 flex-col">
        <header className="proposal-hub-workspace-head shrink-0 pb-5">
          {paneEyebrow ? <p className="proposal-hub-workspace-eyebrow text-[10px] font-bold uppercase tracking-[0.2em]">{paneEyebrow}</p> : null}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">{row.customer_name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", vis.pillClass)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", vis.dotClass)} aria-hidden />
                  {labels.statusLabel(st)}
                </span>
                <span className="text-slate-500">{formatShortDate(row.generated_at)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {lang === "hi" ? "प्रगति" : "Health"}
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-300">{pct}%</p>
            </div>
          </div>
        </header>

        <section aria-labelledby="hub-commercial-heading" className="shrink-0">
          <h3 id="hub-commercial-heading" className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {summaryTitle}
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "proposal-hub-metric rounded-xl border p-3",
                  m.accent && "proposal-hub-metric--accent",
                  "wide" in m && m.wide && "col-span-2 sm:col-span-1"
                )}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{m.label}</p>
                <p className={cn("mt-1 truncate text-lg font-bold tabular-nums tracking-tight", m.accent ? "text-emerald-300" : "text-slate-100")}>
                  {m.value}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_minmax(200px,0.42fr)]">
          <section className="proposal-hub-workspace-next rounded-xl border p-4">
            {nextStepLabel ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{nextStepLabel}</p>
            ) : null}
            <p className={cn("text-sm leading-relaxed text-slate-300", nextStepLabel && "mt-2")}>{dynamicHint}</p>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{nextActionHint}</p>
          </section>
          <ProposalHubIntelPanel row={row} lang={lang} title={intelTitle} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button asChild size="lg" className="proposal-hub-cta-primary col-span-2 min-h-11 gap-2 font-semibold sm:col-span-1 sm:min-w-[200px]">
            <Link href={manageHref}>
              {labels.openWorkspace}
              <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="proposal-hub-cta-secondary min-h-11 gap-2 font-semibold">
            <Link href={publicHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden />
              {labels.previewPublic}
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="proposal-hub-cta-secondary min-h-11 gap-2 font-semibold"
            onClick={() => {
              const url = `${typeof window !== "undefined" ? window.location.origin : ""}${publicHref}`;
              const text = encodeURIComponent(`Solar proposal: ${url}`);
              window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
            }}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {labels.send}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="proposal-hub-cta-ghost h-11 w-11"
            aria-label={labels.moreActions}
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
          </Button>
        </div>

        <Link
          href={manageHref}
          className="proposal-hub-inline-link mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-emerald-300"
        >
          <PencilLine className="h-3.5 w-3.5" aria-hidden />
          {labels.editPricing}
        </Link>
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
