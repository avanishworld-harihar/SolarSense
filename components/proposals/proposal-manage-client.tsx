"use client";

import { ProposalHubHeader } from "@/components/proposals/proposal-hub-header";
import { ProposalModulesStrip } from "@/components/proposals/proposal-modules-strip";
import { ProposalPricingConfigurator, type ProposalPricingConfiguratorLabels } from "@/components/proposals/proposal-pricing-configurator";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import type { ProposalPricingRow } from "@/lib/proposal-pricing-schema";
import type { PremiumProposalPptInput } from "@/lib/proposal-ppt";
import { getProposalLayout } from "@/lib/proposal-layout-merge";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

export type ProposalManageClientProps = {
  proposalId: string;
  customerName: string;
  generatedAt: string;
  pptInput: PremiumProposalPptInput;
  pricing: ProposalPricingRow | null;
};

export function ProposalManageClient({
  proposalId,
  customerName,
  generatedAt,
  pptInput: initialPpt,
  pricing: initialPricing
}: ProposalManageClientProps) {
  const { t } = useLanguage();
  const [pptInput, setPptInput] = useState(initialPpt);
  const [pricing, setPricing] = useState<ProposalPricingRow | null>(initialPricing);

  const configuratorLabels: ProposalPricingConfiguratorLabels = useMemo(
    () => ({
      title: t("proposals_configuratorTitle"),
      subtitle: t("proposals_configuratorSub"),
      systemSize: t("proposals_systemKw"),
      lineCategory: t("proposals_lineCategory"),
      lineDesc: t("proposals_lineDesc"),
      componentCol: t("proposals_colComponent"),
      brandCol: t("proposals_colBrand"),
      qtyCol: t("proposals_colQty"),
      rateCol: t("proposals_colRate"),
      totalCol: t("proposals_colTotal"),
      addLine: t("proposals_addLine"),
      grossTotal: t("proposals_grossTotal"),
      subsidyLabel: t("proposals_subsidy"),
      discountLabel: t("proposals_discount"),
      netPayable: t("proposals_final"),
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

  const onPricingSaved = useCallback((row: ProposalPricingRow) => {
    setPricing(row);
    setPptInput((prev) => mergeProposalPricingIntoPptInput(prev, row));
  }, []);

  const onModulesSaved = useCallback((layout: ProposalTemplateV1) => {
    setPptInput((prev) => ({ ...prev, proposalLayout: layout }));
  }, []);

  if (!pricing) {
    return (
      <div className="space-y-4">
        <ProposalHubHeader
          title={t("proposals_title")}
          subtitle={t("proposals_pricingSub")}
          backHref="/proposals"
          backLabel={t("nav_proposals")}
        />
        <p className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm font-semibold text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
          Pricing is not available. Apply migrations <code className="font-mono text-xs">018_proposal_pricing.sql</code> and{" "}
          <code className="font-mono text-xs">019_proposal_pricing_line_items.sql</code>, then generate a proposal from the bill builder.
        </p>
        <Button asChild variant="outline">
          <Link href="/proposal">{t("nav_proposal")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProposalHubHeader
        title={customerName}
        subtitle={`${t("proposals_generated")} · ${new Date(generatedAt).toLocaleString("en-IN")}`}
        backHref="/proposals"
        backLabel={t("nav_proposals")}
        action={
          <Button asChild variant="secondary" className="gap-2 bg-white/10 text-white hover:bg-white/20">
            <Link href={`/proposal/${proposalId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
              <ExternalLink className="h-4 w-4" aria-hidden />
              {t("proposals_openWeb")}
            </Link>
          </Button>
        }
      />

      <ProposalPricingConfigurator proposalId={proposalId} initial={pricing} labels={configuratorLabels} onSaved={onPricingSaved} />

      <ProposalModulesStrip proposalId={proposalId} initialLayout={proposalLayout} onSaved={onModulesSaved} />

      <section className="rounded-3xl border border-white/55 bg-white/90 p-5 dark:border-white/10 dark:bg-[#0c1017]/90">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("proposals_syncedDeckTitle")}</h3>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{t("proposals_syncedDeckSub")}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="font-semibold text-slate-500">{t("proposals_metricGross")}</dt>
            <dd className="font-black text-slate-900 dark:text-slate-100">₹{summary.grossSystemCost.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">{t("proposals_metricSubsidy")}</dt>
            <dd className="font-black text-slate-900 dark:text-slate-100">₹{summary.pmSubsidy.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">{t("proposals_metricNet")}</dt>
            <dd className="font-black text-teal-700 dark:text-emerald-300">₹{summary.netCost.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">{t("proposals_metricPayback")}</dt>
            <dd className="font-black text-slate-900 dark:text-slate-100">{summary.paybackYears} yrs</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
