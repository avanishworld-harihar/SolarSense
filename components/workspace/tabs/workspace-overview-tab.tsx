"use client";

/**
 * WorkspaceOverviewTab — deal intelligence at a glance.
 *
 * Shows:
 *  - Customer identity + status selector + lifecycle strip
 *  - Intel insight card (next best action, bilingual)
 *  - Commercial snapshot bar (key financials)
 *  - Deal health / velocity / confidence indicators
 *  - ROI at a glance (annual + 25yr lifetime)
 *  - Quick-action CTA row
 */

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  MessageCircle,
  MoreHorizontal,
  TrendingUp,
  Zap,
  Flame,
  Wind,
  Snowflake,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  Handshake,
} from "lucide-react";
import Link from "next/link";

import { ProposalCommercialSnapshotBar } from "@/components/proposals/proposal-commercial-snapshot-bar";
import { WorkflowLifecycleStrip } from "@/components/workflow-lifecycle-strip";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-center";
import { useLanguage } from "@/lib/language-context";
import {
  customerInitials,
  dealHealthScore,
  dealVelocity,
  closingConfidence,
  hubIntelForStatus,
  isCommercialPreset,
  statusVisualLight,
  velocityVisual,
} from "@/lib/proposal-hub-insights";
import { PROPOSAL_STATUS_ORDER, type ProposalStatus } from "@/lib/proposal-status";
import { markProposalSent, openWhatsAppWithProposal, type ProposalShareMetrics } from "@/lib/proposal-share-actions";
import { cn } from "@/lib/utils";
import type { ProposalHubRow } from "@/lib/proposal-hub-insights";
import type { ProposalPricingRow } from "@/lib/proposal-pricing-schema";

// ─── Sub-components ────────────────────────────────────────────────────────

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="min-w-[2rem] text-right text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-400">
        {score}
      </span>
    </div>
  );
}

const STATUS_ICONS: Record<ProposalStatus, React.ReactNode> = {
  draft: <Clock className="h-3.5 w-3.5" />,
  sent: <Send className="h-3.5 w-3.5" />,
  viewed: <Eye className="h-3.5 w-3.5" />,
  negotiation: <Handshake className="h-3.5 w-3.5" />,
  approved: <CheckCircle2 className="h-3.5 w-3.5" />,
};

const VELOCITY_ICONS = {
  hot: <Flame className="h-3.5 w-3.5 text-rose-500" />,
  warm: <Wind className="h-3.5 w-3.5 text-amber-500" />,
  cold: <Snowflake className="h-3.5 w-3.5 text-slate-400" />,
};

// ─── Props ─────────────────────────────────────────────────────────────────

export type WorkspaceOverviewTabProps = {
  row: ProposalHubRow;
  proposalId: string;
  proposalStatus: ProposalStatus;
  annualSavingInr: number;
  pricing: ProposalPricingRow | null;
  summarySystemKw: number;
  summaryNetCost: number;
  summaryPmSubsidy: number;
  summaryPaybackYears: number;
  summaryLifetime25Profit: number;
  onStatusChange: (next: ProposalStatus) => Promise<void>;
  onMoreOpen: () => void;
};

// ─── Component ─────────────────────────────────────────────────────────────

export function WorkspaceOverviewTab({
  row,
  proposalId,
  proposalStatus,
  annualSavingInr,
  summarySystemKw,
  summaryNetCost,
  summaryPmSubsidy,
  summaryPaybackYears,
  summaryLifetime25Profit,
  onStatusChange,
  onMoreOpen,
}: WorkspaceOverviewTabProps) {
  const { t, locale } = useLanguage();
  const toast = useToast();
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const intel = useMemo(
    () => hubIntelForStatus(proposalStatus, (locale === "hi" ? "hi" : "en") as "en" | "hi"),
    [proposalStatus, locale]
  );

  const health = useMemo(() => dealHealthScore(row), [row]);
  const velocity = useMemo(() => dealVelocity(row), [row]);
  const confidence = useMemo(() => closingConfidence(row), [row]);
  const vVis = velocityVisual(velocity);
  const sVis = statusVisualLight(proposalStatus);
  const isCommercial = isCommercialPreset(row.preset_id);
  const initials = customerInitials(row.customer_name);
  const monthlySaving = useMemo(() => Math.round(Math.max(0, annualSavingInr) / 12), [annualSavingInr]);
  const primaryIsSend = proposalStatus === "draft";

  const shareMetrics: ProposalShareMetrics = useMemo(
    () => ({
      customerName: row.customer_name,
      systemKw: summarySystemKw,
      netCostInr: summaryNetCost,
      annualSavingInr: Math.max(0, annualSavingInr),
      paybackLabel: summaryPaybackYears > 0 ? `${summaryPaybackYears} years` : "—",
    }),
    [row.customer_name, summarySystemKw, summaryNetCost, annualSavingInr, summaryPaybackYears]
  );

  const snapshotLabels = useMemo(
    () => ({
      snapshotAria: t("proposals_detail_snapshotAria"),
      system: t("proposals_detail_metricSystem"),
      netPayable: t("proposals_detail_metricNet"),
      monthlySaving: t("proposals_detail_metricSavingMo"),
      subsidy: t("proposals_detail_metricSubsidy"),
      payback: t("proposals_detail_metricPayback"),
      kWUnit: t("proposals_kwLabel"),
    }),
    [t]
  );

  const handleSendWhatsApp = useCallback(async () => {
    setSendingWhatsApp(true);
    openWhatsAppWithProposal(shareMetrics, proposalId);
    try {
      await markProposalSent(proposalId);
      await onStatusChange("sent");
      toast.success(t("proposals_cardSend"), t("proposals_sendDone"));
    } finally {
      setSendingWhatsApp(false);
    }
  }, [shareMetrics, proposalId, onStatusChange, t, toast]);

  const intelToneClass = {
    action: "border-sky-200 bg-sky-50 dark:border-sky-700/40 dark:bg-sky-500/10",
    success: "border-emerald-200 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-500/10",
    warn: "border-amber-200 bg-amber-50 dark:border-amber-700/40 dark:bg-amber-500/10",
    neutral: "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5",
  }[intel.tone];

  const intelTitleClass = {
    action: "text-sky-800 dark:text-sky-200",
    success: "text-emerald-800 dark:text-emerald-200",
    warn: "text-amber-800 dark:text-amber-200",
    neutral: "text-slate-800 dark:text-slate-200",
  }[intel.tone];

  return (
    <div className="space-y-5">
      {/* ── Customer identity card ───────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0c1017] sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isCommercial ? t("proposals_detail_workspaceEyebrow") : t("proposals_detail_workspaceEyebrow")}
        </p>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900"
              aria-hidden
            >
              {initials}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                {row.customer_name}
              </h2>
              {row.company_name && (
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">{row.company_name}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                    sVis.bg,
                    sVis.text,
                    sVis.border
                  )}
                >
                  {STATUS_ICONS[proposalStatus]}
                  {t(`proposals_status_${proposalStatus}`)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                    velocity === "hot"
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                      : velocity === "warm"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                        : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"
                  )}
                >
                  {VELOCITY_ICONS[velocity]}
                  {vVis.label}
                </span>
              </div>
            </div>
          </div>

          {/* Status selector */}
          <label className="sr-only sm:not-sr-only">
            <span className="sr-only">{t("proposals_statusLabel")}</span>
            <select
              value={proposalStatus}
              onChange={(e) => void onStatusChange(e.target.value as ProposalStatus)}
              className="w-full rounded-lg border-0 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 sm:w-auto dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
            >
              {PROPOSAL_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {t(`proposals_status_${s}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Status selector mobile */}
        <label className="mt-3 block sm:hidden">
          <span className="sr-only">{t("proposals_statusLabel")}</span>
          <select
            value={proposalStatus}
            onChange={(e) => void onStatusChange(e.target.value as ProposalStatus)}
            className="w-full rounded-lg border-0 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
          >
            {PROPOSAL_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {t(`proposals_status_${s}`)}
              </option>
            ))}
          </select>
        </label>

        {/* Lifecycle strip */}
        <div className="mt-5 border-t border-slate-100 pt-5 dark:border-white/10">
          <WorkflowLifecycleStrip surface="proposal-detail" proposalStatus={proposalStatus} />
        </div>
      </div>

      {/* ── Intel insight card ───────────────────────────────────────── */}
      <div className={cn("rounded-2xl border px-4 py-4 sm:px-5", intelToneClass)}>
        <p className={cn("text-[11px] font-bold uppercase tracking-wide", intelTitleClass)}>
          {intel.title}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{intel.body}</p>
      </div>

      {/* ── Commercial snapshot bar ──────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0c1017]">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("proposals_detail_snapshotEyebrow")}
        </p>
        <ProposalCommercialSnapshotBar
          systemKw={summarySystemKw}
          netInr={summaryNetCost}
          monthlySavingInr={monthlySaving}
          subsidyInr={summaryPmSubsidy}
          paybackYears={summaryPaybackYears}
          labels={snapshotLabels}
        />
      </div>

      {/* ── Deal intelligence grid ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Health */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0c1017]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Deal health
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{health}</p>
          <HealthBar score={health} />
        </div>

        {/* Confidence */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0c1017]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Close conf.
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
            {confidence}%
          </p>
          <HealthBar score={confidence} />
        </div>

        {/* Annual ROI */}
        <div className="col-span-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:col-span-1 dark:border-white/10 dark:bg-[#0c1017]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("proposals_detail_roiAnnual")}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
            ₹{Math.round(annualSavingInr).toLocaleString("en-IN")}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            <span>25-yr: ₹{Math.round(summaryLifetime25Profit / 100000).toLocaleString("en-IN")}L</span>
          </div>
        </div>
      </div>

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        {primaryIsSend ? (
          <Button
            type="button"
            variant="default"
            size="lg"
            className="min-h-11 w-full gap-2 font-semibold sm:w-auto sm:min-w-[13rem]"
            onClick={() => void handleSendWhatsApp()}
            disabled={sendingWhatsApp}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {t("proposals_detail_primarySend")}
          </Button>
        ) : (
          <Button
            asChild
            variant="default"
            size="lg"
            className="min-h-11 w-full font-semibold sm:w-auto sm:min-w-[13rem]"
          >
            <Link
              href={`/proposal/${proposalId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden />
              {t("proposals_detail_primaryOpenPublic")}
            </Link>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11 w-full gap-2 font-medium sm:w-auto"
          onClick={onMoreOpen}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
          {t("proposals_detail_moreActions")}
        </Button>
        <Button asChild variant="ghost" size="lg" className="min-h-11 w-full gap-2 font-medium sm:w-auto">
          <Link href={`/proposals/${proposalId}`}>
            <Zap className="h-4 w-4" aria-hidden />
            {t("proposals_backToHub")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
