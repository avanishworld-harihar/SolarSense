"use client";

import { ResidentialRequirementBuilder } from "@/components/residential/residential-requirement-builder";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-center";
import {
  applyResidentialFlagsToLayout,
  defaultResidentialConfig,
  parseResidentialConfig,
  type ResidentialProposalConfig,
} from "@/lib/residential-proposal-config";
import { mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import {
  hydrateLineItems,
  proposalPricingRowFromLineItems,
  type PricingLineItem,
} from "@/lib/proposal-pricing-lines";
import type { ProposalPricingRow } from "@/lib/proposal-pricing-schema";
import type { ProposalPricingConfiguratorLabels } from "@/components/proposals/proposal-pricing-configurator";
import { getProposalLayout } from "@/lib/proposal-layout-merge";
import type { PremiumProposalPptInput } from "@/lib/proposal-ppt";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import { grossSubtotalInr } from "@/lib/proposal-pricing-merge";
import {
  ensureResidentialSolarInConfig,
  syncResidentialSolarToLineItems,
} from "@/lib/residential-solar-engine";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  proposalId: string;
  initialPricing: ProposalPricingRow;
  pptInput: PremiumProposalPptInput;
  labels: ProposalPricingConfiguratorLabels;
  onPricingSaved?: (row: ProposalPricingRow) => void;
  onPptInputChange?: (ppt: PremiumProposalPptInput) => void;
  onOpenReview?: () => void;
};

export function ResidentialBomWorkspace({
  proposalId,
  initialPricing,
  pptInput,
  labels,
  onPricingSaved,
  onPptInputChange,
  onOpenReview,
}: Props) {
  const toast = useToast();
  const [pricing, setPricing] = useState(initialPricing);
  const [lines, setLines] = useState<PricingLineItem[]>(() => hydrateLineItems(initialPricing));
  const [config, setConfig] = useState<ResidentialProposalConfig>(() => {
    const base =
      parseResidentialConfig(pptInput.residentialConfig) ??
      defaultResidentialConfig(initialPricing.system_kw);
    return ensureResidentialSolarInConfig(base, initialPricing.system_kw);
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPricing(initialPricing);
    setLines(hydrateLineItems(initialPricing));
  }, [initialPricing]);

  const solar = config.solar;

  const preview = useMemo(() => {
    const syncedLines = syncResidentialSolarToLineItems(solar, lines);
    return proposalPricingRowFromLineItems(pricing, syncedLines, {
      system_kw: solar.plantCapacityKw,
    });
  }, [pricing, lines, solar]);

  const liveSummary = useMemo(() => {
    const merged = mergeProposalPricingIntoPptInput(
      { ...pptInput, residentialConfig: config },
      preview
    );
    return summarizeProposalDeck(merged);
  }, [pptInput, config, preview]);

  const patchConfig = useCallback((next: ResidentialProposalConfig) => {
    setConfig(next);
    setLines((prev) => syncResidentialSolarToLineItems(next.solar, prev));
    setPricing((p) => ({ ...p, system_kw: next.solar.plantCapacityKw }));
  }, []);

  async function saveAll() {
    setSaving(true);
    try {
      const syncedLines = syncResidentialSolarToLineItems(solar, lines);
      const layout: ProposalTemplateV1 = applyResidentialFlagsToLayout(getProposalLayout(pptInput), config);

      const prRes = await fetch(`/api/proposals/${proposalId}/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_items: syncedLines,
          system_kw: solar.plantCapacityKw,
        }),
      });
      const prJson = (await prRes.json()) as { ok?: boolean; pricing?: ProposalPricingRow; error?: string };
      if (!prRes.ok || !prJson.ok || !prJson.pricing) {
        throw new Error(prJson.error || labels.saveFailed);
      }

      const cfgRes = await fetch(`/api/proposals/${proposalId}/residential-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ residentialConfig: config, proposalLayout: layout }),
      });
      const cfgJson = (await cfgRes.json()) as { ok?: boolean; error?: string };
      if (!cfgRes.ok || !cfgJson.ok) {
        throw new Error(cfgJson.error || "Residential config save failed");
      }

      setPricing(prJson.pricing);
      setLines(hydrateLineItems(prJson.pricing));
      onPricingSaved?.(prJson.pricing);
      onPptInputChange?.({
        ...pptInput,
        residentialConfig: config,
        proposalLayout: layout,
        systemKw: solar.plantCapacityKw,
        financeOption: config.financing?.enabled
          ? {
              interestRatePct: config.financing.interestRatePct,
              tenuresYears: config.financing.tenuresYears ?? [3, 5, 7, 10],
              selectedTenureYears: config.financing.selectedTenureYears,
            }
          : pptInput.financeOption,
      });
      toast.push({ tone: "success", title: labels.saved });
    } catch (e) {
      toast.push({
        tone: "error",
        title: labels.saveFailed,
        description: e instanceof Error ? e.message : "",
      });
    } finally {
      setSaving(false);
    }
  }

  const gross = grossSubtotalInr(preview);
  const net = preview.final_amount_inr;

  return (
    <div className="space-y-5">
      <ResidentialRequirementBuilder
        config={config}
        onChange={patchConfig}
        netCostInr={Math.round(net)}
        annualSavingInr={liveSummary.annualSaving}
      />

      {onOpenReview ? (
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onOpenReview}>
          Review proposal sections
        </Button>
      ) : null}

      <div className="sticky bottom-0 z-10 rounded-2xl border border-emerald-200/90 bg-white/95 p-3 shadow-lg backdrop-blur-md dark:border-emerald-900/40 dark:bg-[#0c1017]/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Gross</p>
              <p className="font-bold tabular-nums">₹{gross.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Net payable</p>
              <p className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                ₹{Math.round(net).toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Plant</p>
              <p className="font-bold tabular-nums">{solar.plantCapacityKw} kW</p>
            </div>
          </div>
          <Button type="button" className="min-w-[9rem] bg-emerald-600 font-semibold hover:bg-emerald-700" disabled={saving} onClick={() => void saveAll()}>
            {saving ? labels.saving : labels.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
