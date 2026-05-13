"use client";

import { ProposalHubHeader } from "@/components/proposals/proposal-hub-header";
import { ProposalDetailSection } from "@/components/proposals/proposal-detail-section";
import { ProposalModulesStrip } from "@/components/proposals/proposal-modules-strip";
import { ProposalPricingConfigurator, type ProposalPricingConfiguratorLabels } from "@/components/proposals/proposal-pricing-configurator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-center";
import { useLanguage } from "@/lib/language-context";
import { mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import type { ProposalPricingRow } from "@/lib/proposal-pricing-schema";
import type { PremiumProposalPptInput } from "@/lib/proposal-ppt";
import { getProposalLayout } from "@/lib/proposal-layout-merge";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import type { ProposalStatus } from "@/lib/proposal-status";
import { PROPOSAL_STATUS_ORDER } from "@/lib/proposal-status";
import { ExternalLink, FileDown, MessageCircle } from "lucide-react";
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
      saveFailed: t("proposals_saveFailed")
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
      <div className="space-y-4">
        <ProposalHubHeader
          title={t("proposals_title")}
          subtitle={t("proposals_pricingSub")}
          backHref="/proposals"
          backLabel={t("proposals_backToHub")}
        />
        <p className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm font-semibold text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
          Pricing is not available. Apply migrations <code className="font-mono text-xs">018_proposal_pricing.sql</code> and{" "}
          <code className="font-mono text-xs">019_proposal_pricing_line_items.sql</code>, then generate a proposal from the bill builder.
        </p>
        <Button asChild variant="outline">
          <Link href="/proposal">{t("proposals_newProposalCta")}</Link>
        </Button>
      </div>
    );
  }

  const loc = (location ?? pptInput.location ?? "").trim();
  const headerSub = [loc, `${t("proposals_generated")} · ${new Date(generatedAt).toLocaleString("en-IN")}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5 pb-6">
      <ProposalHubHeader
        title={t("proposals_detailWorkspaceTitle")}
        subtitle={headerSub}
        backHref="/proposals"
        backLabel={t("proposals_backToHub")}
        action={
          <Button asChild variant="secondary" className="gap-2 bg-white/10 text-white hover:bg-white/20">
            <Link href={`/proposal/${proposalId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
              <ExternalLink className="h-4 w-4" aria-hidden />
              {t("proposals_openWeb")}
            </Link>
          </Button>
        }
      />

      <ProposalDetailSection id="customer" title={t("proposals_section_customer")} subtitle={t("proposals_section_customerSub")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-sm font-black text-white shadow-lg"
              aria-hidden
            >
              {customerInitials(customerName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-slate-900 dark:text-slate-50">{customerName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t("proposals_statusLabel")}
                  <select
                    value={proposalStatus}
                    onChange={(e) => void onStatusChange(e.target.value as ProposalStatus)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] font-bold normal-case text-slate-900 dark:border-white/15 dark:bg-[#0f1419] dark:text-slate-100"
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
      </ProposalDetailSection>

      <ProposalDetailSection
        id="commercial"
        title={t("proposals_section_commercial")}
        subtitle={t("proposals_section_commercialSub")}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[9px] font-extrabold uppercase text-slate-500">{t("proposals_metricGross")}</p>
            <p className="mt-0.5 text-sm font-black tabular-nums">₹{summary.grossSystemCost.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[9px] font-extrabold uppercase text-slate-500">{t("proposals_metricSubsidy")}</p>
            <p className="mt-0.5 text-sm font-black tabular-nums">₹{summary.pmSubsidy.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[9px] font-extrabold uppercase text-slate-500">{t("proposals_metricNet")}</p>
            <p className="mt-0.5 text-sm font-black tabular-nums text-teal-700 dark:text-emerald-300">
              ₹{summary.netCost.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[9px] font-extrabold uppercase text-slate-500">{t("proposals_estSavingMo")}</p>
            <p className="mt-0.5 text-sm font-black tabular-nums">₹{savingMonthly.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[9px] font-extrabold uppercase text-slate-500">{t("proposals_metricPayback")}</p>
            <p className="mt-0.5 text-sm font-black">{summary.paybackYears} yrs</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[9px] font-extrabold uppercase text-slate-500">{t("proposals_panelBrand")}</p>
            <p className="mt-0.5 truncate text-sm font-bold">{summary.panelBrand ?? "—"}</p>
          </div>
        </div>
      </ProposalDetailSection>

      <ProposalDetailSection id="bom" title={t("proposals_section_bom")} subtitle={t("proposals_section_bomSub")}>
        <ProposalPricingConfigurator proposalId={proposalId} initial={pricing} labels={configuratorLabels} onSaved={onPricingSaved} />
      </ProposalDetailSection>

      <ProposalDetailSection id="savings" title={t("proposals_section_savings")} subtitle={t("proposals_section_savingsSub")}>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-3 py-2.5 dark:border-emerald-500/20 dark:bg-emerald-950/25">
            <p className="text-[10px] font-extrabold uppercase text-emerald-800 dark:text-emerald-200">{t("proposals_annualSaving")}</p>
            <p className="text-lg font-black tabular-nums text-emerald-950 dark:text-emerald-100">
              ₹{Math.round(Math.max(0, annualSavingInr || summary.annualSaving)).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-[#0f1419]">
            <p className="text-[10px] font-extrabold uppercase text-slate-500">{t("proposals_estSavingMo")}</p>
            <p className="text-lg font-black tabular-nums">₹{savingMonthly.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-[#0f1419]">
            <p className="text-[10px] font-extrabold uppercase text-slate-500">{t("proposals_lifetimeHint")}</p>
            <p className="text-lg font-black tabular-nums">₹{summary.lifetime25Profit.toLocaleString("en-IN")}</p>
            <p className="text-[10px] font-medium text-slate-500">25 yr · {t("proposals_lifetimeHintSub")}</p>
          </div>
        </div>
      </ProposalDetailSection>

      <ProposalDetailSection id="sections" title={t("proposals_section_modules")} subtitle={t("proposals_section_modulesSub")}>
        <ProposalModulesStrip
          proposalId={proposalId}
          initialLayout={proposalLayout}
          onSaved={onModulesSaved}
          className="border-0 bg-transparent shadow-none dark:bg-transparent"
        />
      </ProposalDetailSection>

      <ProposalDetailSection id="attachments" title={t("proposals_section_attachments")} subtitle={t("proposals_section_attachmentsSub")}>
        <p className="rounded-xl border border-dashed border-slate-300/80 bg-slate-50/50 px-3 py-6 text-center text-xs font-semibold text-slate-500 dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-400">
          {t("proposals_attachmentsPlaceholder")}
        </p>
      </ProposalDetailSection>

      <ProposalDetailSection id="notes" title={t("proposals_section_notes")} subtitle={t("proposals_section_notesSub")}>
        <p className="rounded-xl border border-dashed border-slate-300/80 bg-slate-50/50 px-3 py-6 text-center text-xs font-semibold text-slate-500 dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-400">
          {t("proposals_notesPlaceholder")}
        </p>
      </ProposalDetailSection>

      <ProposalDetailSection id="export" title={t("proposals_section_export")} subtitle={t("proposals_section_exportSub")}>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="emeraldCta" size="sm" className="gap-2 font-bold">
            <Link href={`/proposal/${proposalId}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden />
              {t("proposals_openWeb")}
            </Link>
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2 font-bold" onClick={() => toast.info(t("proposals_comingSoon"), t("proposals_cardGenerateQuote"))}>
            <FileDown className="h-4 w-4" aria-hidden />
            {t("proposals_cardGenerateQuote")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2 font-bold" onClick={() => toast.info(t("proposals_comingSoon"), t("proposals_cardSend"))}>
            <MessageCircle className="h-4 w-4" aria-hidden />
            {t("proposals_cardSend")}
          </Button>
        </div>
      </ProposalDetailSection>
    </div>
  );
}
