"use client";

import { ProposalHubActionsSheet } from "@/components/proposals/proposal-hub-actions-sheet";
import { ProposalHubIntelPanel } from "@/components/proposals/proposal-hub-intel-panel";
import type { ProposalListCardProps } from "@/components/proposals/proposal-list-card";
import { Button } from "@/components/ui/button";
import { hubNextActionHint, statusProgressPct, statusVisual } from "@/lib/proposal-hub-insights";
import { shareMetricsFromHubRow } from "@/lib/proposal-hub-share";
import { markProposalSent, openWhatsAppWithProposal } from "@/lib/proposal-share-actions";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink, MessageCircle, MoreHorizontal, PencilLine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ProposalHubDealRow } from "./proposal-hub-deal-list";

function isMobileLayout(layout: "pane" | "flow" | "mobile") {
  return layout === "mobile";
}

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
  intelTitle = "Recommended next",
  layout = "pane",
  onScrollToPipeline,
  onBack,
  onDeleted,
  onSent
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
  /** pane = desktop split; mobile = full-width detail pane; flow = legacy stacked scroll */
  layout?: "pane" | "flow" | "mobile";
  /** Mobile: scroll back to pipeline list */
  onScrollToPipeline?: () => void;
  onBack?: () => void;
  onDeleted?: () => void;
  onSent?: () => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const reduced = useReducedMotion();
  const showPipelineNav = isMobileLayout(layout) && (onScrollToPipeline ?? onBack);
  const goToPipeline = onScrollToPipeline ?? onBack;

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

  const isPane = layout === "pane";
  const isMobile = layout === "mobile";

  return (
    <>
      {showPipelineNav ? (
        <motion.div className="proposal-hub-mobile-workspace-nav sticky top-0 z-10 border-b border-[var(--hub-border)] bg-[color-mix(in_srgb,var(--hub-surface)_92%,transparent)] px-3 py-2.5 backdrop-blur-md">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="proposal-hub-mobile-sticky-nav-btn h-10 w-full justify-start gap-2 rounded-xl text-sm font-semibold shadow-sm"
            onClick={goToPipeline}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {lang === "hi" ? "सभी प्रस्ताव — सूची" : "All proposals — back to list"}
          </Button>
        </motion.div>
      ) : null}
      <div
        className={cn(
          "proposal-hub-workspace flex flex-col",
          isPane
            ? "proposal-hub-workspace--pane h-full min-h-0"
            : isMobile
              ? "proposal-hub-workspace--mobile relative h-auto w-full"
              : "proposal-hub-workspace--stacked relative h-auto w-full"
        )}
      >
        <div
          className={cn(
            isPane
              ? "proposal-hub-workspace-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [-webkit-overflow-scrolling:touch] sm:px-6 sm:py-6 lg:px-8 lg:py-7"
              : isMobile
                ? "proposal-hub-workspace-scroll px-4 py-4"
                : "proposal-hub-workspace-scroll h-auto overflow-visible px-5 py-5 sm:px-6 sm:py-6"
          )}
        >
        <header className={cn("proposal-hub-workspace-head shrink-0", isMobile ? "pb-3" : "pb-4 sm:pb-5")}>
          {paneEyebrow && !isMobile ? (
            <p className="proposal-hub-workspace-eyebrow text-[10px] font-bold uppercase tracking-[0.2em]">{paneEyebrow}</p>
          ) : null}
          {isMobile && paneEyebrow ? (
            <p className="proposal-hub-mobile-kicker mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              {paneEyebrow}
            </p>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2
                className={cn(
                  "proposal-hub-text-primary font-bold tracking-tight",
                  isMobile ? "text-xl leading-tight" : "text-2xl sm:text-3xl"
                )}
              >
                {row.customer_name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", vis.pillClass)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", vis.dotClass)} aria-hidden />
                  {labels.statusLabel(st)}
                </span>
                <span className="proposal-hub-text-muted">{formatShortDate(row.generated_at)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="proposal-hub-text-muted text-[10px] font-semibold uppercase tracking-wide">
                {lang === "hi" ? "प्रगति" : "Health"}
              </p>
              <p className="proposal-hub-text-accent mt-0.5 text-lg font-bold tabular-nums">{pct}%</p>
            </div>
          </div>
        </header>

        <section aria-labelledby="hub-commercial-heading" className="shrink-0">
          <h3 id="hub-commercial-heading" className="proposal-hub-text-muted text-[10px] font-bold uppercase tracking-[0.18em]">
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
                  "proposal-hub-glass-card proposal-hub-metric rounded-xl border p-3",
                  m.accent && "proposal-hub-metric--accent",
                  "wide" in m && m.wide && "col-span-2 sm:col-span-1"
                )}
              >
                <p className="proposal-hub-text-muted text-[10px] font-medium uppercase tracking-wide">{m.label}</p>
                <p
                  className={cn(
                    "mt-1 truncate text-lg font-bold tabular-nums tracking-tight",
                    m.accent ? "proposal-hub-text-metric-accent" : "proposal-hub-text-metric"
                  )}
                >
                  {m.value}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <motion.div className={cn("mt-5 grid gap-4", isPane && "lg:grid-cols-[1fr_minmax(200px,0.42fr)]")}>
          <section className="proposal-hub-glass-card proposal-hub-workspace-next rounded-xl border p-4">
            {nextStepLabel ? (
              <p className="proposal-hub-text-muted text-[10px] font-bold uppercase tracking-[0.18em]">{nextStepLabel}</p>
            ) : null}
            <p className={cn("proposal-hub-text-body text-sm leading-relaxed", nextStepLabel && "mt-2")}>{dynamicHint}</p>
            <p className="proposal-hub-text-muted mt-3 text-[11px] leading-relaxed">{nextActionHint}</p>
          </section>
          <ProposalHubIntelPanel row={row} lang={lang} title={intelTitle} />
        </motion.div>
        </div>

        <footer className="proposal-hub-workspace-actions proposal-hub-glass-bar shrink-0 border-t border-[var(--hub-border)] px-4 py-4 sm:px-5 lg:px-7">
          <div className={cn("flex gap-2", isMobile || !isPane ? "flex-col" : "flex-col sm:flex-row sm:flex-wrap")}>
            <Button asChild size="lg" className="proposal-hub-cta-primary min-h-11 w-full gap-2 font-semibold sm:w-auto sm:min-w-[200px]">
              <Link href={manageHref}>
                {labels.openWorkspace}
                <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="proposal-hub-cta-secondary min-h-11 w-full gap-2 font-semibold sm:w-auto">
              <Link href={publicHref} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{labels.previewPublic}</span>
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="proposal-hub-cta-secondary min-h-11 w-full gap-2 font-semibold sm:w-auto"
              onClick={() => {
                openWhatsAppWithProposal(shareMetricsFromHubRow(row), row.id);
                void markProposalSent(row.id).then((ok) => {
                  if (ok) onSent?.();
                });
              }}
            >
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
              {labels.send}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="proposal-hub-cta-ghost h-11 w-11 shrink-0 self-end sm:self-auto"
              aria-label={labels.moreActions}
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen(true)}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden />
            </Button>
          </div>

          <Link
            href={manageHref}
            className="proposal-hub-inline-link proposal-hub-text-muted mt-3 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-emerald-600 dark:hover:text-emerald-300"
          >
            <PencilLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {labels.editPricing}
          </Link>
        </footer>
      </div>

      <ProposalHubActionsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        proposalId={row.id}
        labels={labels}
        annualSavingInr={row.annual_saving_inr}
        shareMetrics={shareMetricsFromHubRow(row)}
        onDeleted={onDeleted}
        onSent={onSent}
      />
    </>
  );
}
