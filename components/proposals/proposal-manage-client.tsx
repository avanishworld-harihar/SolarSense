"use client";

import { ProposalCommercialSnapshotBar } from "@/components/proposals/proposal-commercial-snapshot-bar";
import { ProposalDetailActionsSheet } from "@/components/proposals/proposal-detail-actions-sheet";
import { ProposalDetailSection } from "@/components/proposals/proposal-detail-section";
import { ProposalHubHeader } from "@/components/proposals/proposal-hub-header";
import { ProposalModulesStrip } from "@/components/proposals/proposal-modules-strip";
import { CommercialBomWorkspace } from "@/components/commercial/bom/commercial-bom-workspace";
import { ProposalReviewSheet } from "@/components/commercial/proposal-review-sheet";
import type { ProposalPresetId } from "@/components/proposals/os/preset-picker";
import {
  ProposalPricingConfigurator,
  type ProposalPricingConfiguratorLabels,
} from "@/components/proposals/proposal-pricing-configurator";
import { WorkflowLifecycleStrip } from "@/components/workflow-lifecycle-strip";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-center";
import { useLanguage } from "@/lib/language-context";
import { mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import type { ProposalPricingRow } from "@/lib/proposal-pricing-schema";
import type { PremiumProposalPptInput } from "@/lib/proposal-ppt";
import { getProposalLayout } from "@/lib/proposal-layout-merge";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import { markProposalSent, openWhatsAppWithProposal, type ProposalShareMetrics } from "@/lib/proposal-share-actions";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import type { ProposalStatus } from "@/lib/proposal-status";
import { PROPOSAL_STATUS_ORDER } from "@/lib/proposal-status";
import { ExternalLink, MessageCircle, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase() || "?";
}

export type ProposalManageClientProps = {
  proposalId: string;
  customerName: string;
  generatedAt: string;
  location?: string | null;
  presetId?: string;
  proposalStatus: ProposalStatus;
  annualSavingInr: number;
  pptInput: PremiumProposalPptInput;
  pricing: ProposalPricingRow | null;
};

export function ProposalManageClient({
  proposalId,
  customerName,
  generatedAt,
  location,
  presetId = "residential_smart",
  proposalStatus: initialStatus,
  annualSavingInr,
  pptInput: initialPpt,
  pricing: initialPricing
}: ProposalManageClientProps) {
  const { t } = useLanguage();
  const toast = useToast();
  const [pptInput, setPptInput] = useState(initialPpt);
  const [pricing, setPricing] = useState<ProposalPricingRow | null>(initialPricing);
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus>(initialStatus);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    setProposalStatus(initialStatus);
  }, [initialStatus, proposalId]);

  const configuratorLabels: ProposalPricingConfiguratorLabels = useMemo(
    () => ({
      title: t("proposals_bomTitle"),
      subtitle: t("proposals_bomSub"),
      systemSize: t("proposals_systemKw"),
      categoryCol: t("proposals_bomCategory"),
      itemCol: t("proposals_bomItem"),
      brandCol: t("proposals_colBrand"),
      qtyCol: t("proposals_colQty"),
      unitCol: t("proposals_colUnit"),
      rateCol: t("proposals_colRate"),
      amountCol: t("proposals_colAmount"),
      notesCol: t("proposals_colNotes"),
      addLine: t("proposals_addLine"),
      summaryGross: t("proposals_grossTotal"),
      summarySubsidy: t("proposals_subsidy"),
      summaryDiscount: t("proposals_discount"),
      summaryNet: t("proposals_final"),
      ppwGross: t("proposals_ppwGross"),
      ppwNet: t("proposals_ppwNet"),
      manualFinal: t("proposals_manualFinal"),
      save: t("proposals_save"),
      saving: t("proposals_saving"),
      saved: t("proposals_saved"),
      saveFailed: t("proposals_saveFailed"),
      removeLine: t("proposals_removeLine")
    }),
    [t]
  );

  const mergedInput = useMemo(() => mergeProposalPricingIntoPptInput(pptInput, pricing), [pptInput, pricing]);
  const summary = useMemo(() => summarizeProposalDeck(mergedInput), [mergedInput]);
  const proposalLayout = useMemo(() => getProposalLayout(pptInput), [pptInput]);

  const savingMonthly = useMemo(() => {
    const a = Math.max(0, annualSavingInr || summary.annualSaving || 0);
    return Math.round(a / 12);
  }, [annualSavingInr, summary.annualSaving]);

  const primaryIsSend = proposalStatus === "draft";

  const nextStepText = useMemo(() => t(`proposals_detail_next_${proposalStatus}`), [t, proposalStatus]);
  const commsText = useMemo(() => t(`proposals_detail_comms_${proposalStatus}`), [t, proposalStatus]);

  const snapshotLabels = useMemo(
    () => ({
      snapshotAria: t("proposals_detail_snapshotAria"),
      system: t("proposals_detail_metricSystem"),
      netPayable: t("proposals_detail_metricNet"),
      monthlySaving: t("proposals_detail_metricSavingMo"),
      subsidy: t("proposals_detail_metricSubsidy"),
      payback: t("proposals_detail_metricPayback"),
      kWUnit: t("proposals_kwLabel")
    }),
    [t]
  );

  const sheetLabels = useMemo(
    () => ({
      moreActions: t("proposals_detail_moreActions"),
      sheetClose: t("proposals_sheetClose"),
      openPublic: t("proposals_openWeb"),
      pdfQuote: t("proposals_cardPdfQuote"),
      send: t("proposals_cardSend"),
      duplicate: t("proposals_cardDuplicate"),
      archive: t("proposals_cardArchive"),
      jumpToPricing: t("proposals_detail_jumpToPricing"),
      comingSoon: t("proposals_comingSoon"),
      deleteProposal: t("proposals_deleteProposal"),
      deleteConfirm: t("proposals_deleteConfirm"),
      deleteDone: t("proposals_deleteDone"),
      deleteFailed: t("proposals_deleteFailed"),
      sendDone: t("proposals_sendDone"),
      pptFailed: t("proposals_pptFailed")
    }),
    [t]
  );

  const shareMetrics: ProposalShareMetrics = useMemo(
    () => ({
      customerName,
      systemKw: summary.systemKw,
      netCostInr: summary.netCost,
      annualSavingInr: Math.max(0, annualSavingInr || summary.annualSaving),
      paybackLabel: summary.paybackYears > 0 ? `${summary.paybackYears} years` : "—"
    }),
    [customerName, summary, annualSavingInr]
  );

  const onPricingSaved = useCallback((row: ProposalPricingRow) => {
    setPricing(row);
    setPptInput((prev) => mergeProposalPricingIntoPptInput(prev, row));
  }, []);

  const onModulesSaved = useCallback((layout: ProposalTemplateV1) => {
    setPptInput((prev) => ({ ...prev, proposalLayout: layout }));
  }, []);

  async function onStatusChange(next: ProposalStatus) {
    const prev = proposalStatus;
    setProposalStatus(next);
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal_status: next })
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error ?? "update_failed");
    } catch {
      setProposalStatus(prev);
      toast.push({ tone: "error", title: t("proposals_statusUpdateFailed") });
    }
  }

  if (!pricing) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 pb-6">
        <ProposalHubHeader
          variant="workspace"
          title={t("proposals_title")}
          subtitle={t("proposals_pricingSub")}
          backHref="/proposals"
          backLabel={t("proposals_backToHub")}
        />
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-[#0c1017]">
          <WorkflowLifecycleStrip surface="proposal-detail" proposalStatus={initialStatus} />
          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Pricing is not available. Apply migrations <code className="font-mono text-xs">018_proposal_pricing.sql</code> and{" "}
            <code className="font-mono text-xs">019_proposal_pricing_line_items.sql</code>, then generate a proposal from the bill builder.
          </p>
          <Button asChild variant="default" className="mt-4 font-semibold">
            <Link href="/proposal">{t("proposals_newProposalCta")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const loc = (location ?? pptInput.location ?? "").trim();
  const headerSub = [loc, `${t("proposals_generated")} · ${new Date(generatedAt).toLocaleString("en-IN")}`]
    .filter(Boolean)
    .join(" · ");

  const annualRounded = Math.round(Math.max(0, annualSavingInr || summary.annualSaving));

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8 pt-1 lg:pb-10">
      <ProposalHubHeader
        variant="workspace"
        title={t("proposals_detailWorkspaceTitle")}
        subtitle={headerSub}
        backHref="/proposals"
        backLabel={t("proposals_backToHub")}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-stretch">
            {primaryIsSend ? (
              <Button
                type="button"
                variant="default"
                size="lg"
                className="min-h-11 w-full gap-2 font-semibold sm:w-auto sm:min-w-[12rem]"
                onClick={() => {
                  openWhatsAppWithProposal(shareMetrics, proposalId);
                  void markProposalSent(proposalId).then((ok) => {
                    if (ok) setProposalStatus("sent");
                  });
                  toast.success(t("proposals_cardSend"), t("proposals_sendDone"));
                }}
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                {t("proposals_detail_primarySend")}
              </Button>
            ) : (
              <Button asChild variant="default" size="lg" className="min-h-11 w-full font-semibold sm:w-auto sm:min-w-[12rem]">
                <Link href={`/proposal/${proposalId}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2">
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  {t("proposals_detail_primaryOpenPublic")}
                </Link>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-11 w-full gap-2 font-medium sm:w-auto"
              onClick={() => setMoreOpen(true)}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
              {t("proposals_detail_moreActions")}
            </Button>
          </div>
        }
      />

      <ProposalDetailActionsSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        proposalId={proposalId}
        labels={sheetLabels}
        primaryIsSend={primaryIsSend}
        shareMetrics={shareMetrics}
        onSent={() => setProposalStatus("sent")}
      />

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0c1017] sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t("proposals_detail_workspaceEyebrow")}
        </p>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
              aria-hidden
            >
              {customerInitials(customerName)}
            </span>
            <div className="min-w-0 space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">{customerName}</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-800 dark:text-slate-200">{t(`proposals_status_${proposalStatus}`)}</span>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                  ·
                </span>
                <label className="inline-flex items-center gap-2">
                  <span className="sr-only">{t("proposals_statusLabel")}</span>
                  <select
                    value={proposalStatus}
                    onChange={(e) => void onStatusChange(e.target.value as ProposalStatus)}
                    className="max-w-full rounded-lg border-0 bg-slate-100 px-2 py-1.5 text-sm font-medium text-slate-900 ring-1 ring-slate-200/80 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                  >
                    {PROPOSAL_STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {t(`proposals_status_${s}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
          <WorkflowLifecycleStrip surface="proposal-detail" proposalStatus={proposalStatus} />
        </div>

        <div className="mt-6 space-y-2 border-t border-slate-100 pt-6 dark:border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("proposals_detail_nextLabel")}</p>
          <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">{nextStepText}</p>
        </div>

        <div className="mt-5 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("proposals_detail_commsLabel")}</p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{commsText}</p>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-slate-500 dark:text-slate-500">{t("proposals_detail_healthLine")}</p>

        <div className="mt-6 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("proposals_detail_snapshotEyebrow")}</p>
          <ProposalCommercialSnapshotBar
            systemKw={summary.systemKw}
            netInr={summary.netCost}
            monthlySavingInr={savingMonthly}
            subsidyInr={summary.pmSubsidy}
            paybackYears={summary.paybackYears}
            labels={snapshotLabels}
          />
        </div>

        <div className="mt-6 grid gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2 dark:border-white/10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("proposals_detail_roiAnnual")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">₹{annualRounded.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("proposals_detail_roiLifetime")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              ₹{summary.lifetime25Profit.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      <ProposalDetailSection
        id="bom"
        variant="workspace"
        title={t("proposals_section_bom")}
        subtitle={
          presetId === "commercial_executive"
            ? "Requirement-based commercial BOM — plant kW, DCR / Non-DCR brands, scenarios, EMI, and reusable pricing."
            : t("proposals_section_bomSub")
        }
      >
        {presetId === "commercial_executive" && pricing ? (
          <CommercialBomWorkspace
            proposalId={proposalId}
            initialPricing={pricing}
            pptInput={pptInput}
            labels={configuratorLabels}
            onPricingSaved={onPricingSaved}
            onPptInputChange={setPptInput}
            onOpenReview={() => setReviewOpen(true)}
          />
        ) : pricing ? (
          <ProposalPricingConfigurator
            proposalId={proposalId}
            initial={pricing}
            labels={configuratorLabels}
            onSaved={onPricingSaved}
            chrome="workspace"
          />
        ) : null}
      </ProposalDetailSection>

      <ProposalDetailSection id="sections" variant="workspace" title={t("proposals_section_modules")} subtitle={t("proposals_section_modulesSub")}>
        <ProposalModulesStrip proposalId={proposalId} initialLayout={proposalLayout} onSaved={onModulesSaved} tone="embedded" />
      </ProposalDetailSection>

      <ProposalDetailSection id="attachments" variant="workspace" title={t("proposals_section_attachments")} subtitle={t("proposals_section_attachmentsSub")}>
        <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
          {t("proposals_attachmentsPlaceholder")}
        </p>
      </ProposalDetailSection>

      <ProposalDetailSection id="notes" variant="workspace" title={t("proposals_section_notes")} subtitle={t("proposals_section_notesSub")}>
        <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
          {t("proposals_notesPlaceholder")}
        </p>
      </ProposalDetailSection>

      {presetId === "commercial_executive" ? (
        <ProposalReviewSheet
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          proposalId={proposalId}
          presetId={presetId as ProposalPresetId}
          layout={proposalLayout}
          onLayoutChange={(nextLayout) => setPptInput((prev) => ({ ...prev, proposalLayout: nextLayout }))}
        />
      ) : null}
    </div>
  );
}

