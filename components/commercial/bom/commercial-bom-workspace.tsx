"use client";

import { CommercialControlCenter } from "@/components/commercial/bom/commercial-control-center";
import { CommercialDcrPreview } from "@/components/commercial/bom/commercial-dcr-preview";
import { CommercialHardwareBom } from "@/components/commercial/bom/commercial-hardware-bom";
import { CommercialPricingTemplatesPanel } from "@/components/commercial/bom/commercial-pricing-templates-panel";
import { CommercialSolarPanelSection } from "@/components/commercial/bom/commercial-solar-panel-section";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-center";
import {
  applyCommercialFlagsToLayout,
  defaultCommercialConfig,
  parseCommercialConfig,
  type CommercialProposalConfig,
} from "@/lib/commercial-proposal-config";
import {
  ensureSolarPanelsInConfig,
  solarPanelsFromLineItems,
  syncLegacyPanelFieldsFromSolar,
  syncSolarPanelsToLineItems,
} from "@/lib/commercial-solar-engine";
import { defaultSolarPanels } from "@/lib/commercial-solar-schema";
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

export function CommercialBomWorkspace({
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
  const [config, setConfig] = useState<CommercialProposalConfig>(() => {
    const base = parseCommercialConfig(pptInput.commercialConfig) ?? defaultCommercialConfig(initialPricing.system_kw);
    return ensureSolarPanelsInConfig(base, initialPricing.system_kw);
  });
  const [saving, setSaving] = useState(false);
  const [manualFinal, setManualFinal] = useState(initialPricing.manual_final_override);
  const [manualFinalAmt, setManualFinalAmt] = useState(initialPricing.final_amount_inr);

  useEffect(() => {
    setPricing(initialPricing);
    setLines(hydrateLineItems(initialPricing));
    setManualFinal(initialPricing.manual_final_override);
    setManualFinalAmt(initialPricing.final_amount_inr);
  }, [initialPricing]);

  const solar = useMemo(() => {
    if (config.solarPanels) return config.solarPanels;
    return defaultSolarPanels(pricing.system_kw);
  }, [config.solarPanels, pricing.system_kw]);

  const preview = useMemo(() => {
    const syncedLines = syncSolarPanelsToLineItems(solar, lines);
    return proposalPricingRowFromLineItems(
      { ...pricing, manual_final_override: manualFinal, final_amount_inr: manualFinalAmt },
      syncedLines,
      {
        system_kw: solar.plantCapacityKw,
        manual_final_override: manualFinal,
        final_amount_inr: manualFinal ? manualFinalAmt : undefined,
      }
    );
  }, [pricing, lines, solar, manualFinal, manualFinalAmt]);

  const liveSummary = useMemo(() => {
    const merged = mergeProposalPricingIntoPptInput(
      { ...pptInput, commercialConfig: syncLegacyPanelFieldsFromSolar({ ...config, solarPanels: solar }) },
      preview
    );
    return summarizeProposalDeck(merged);
  }, [pptInput, config, solar, preview]);

  const gross = grossSubtotalInr(preview);
  const net = preview.final_amount_inr;

  const patchSolar = useCallback(
    (nextSolar: typeof solar) => {
      const kw = nextSolar.plantCapacityKw;
      setConfig((c) => ({ ...c, solarPanels: nextSolar }));
      setLines((prev) => syncSolarPanelsToLineItems(nextSolar, prev));
      setPricing((p) => ({ ...p, system_kw: kw }));
    },
    []
  );

  async function saveAll() {
    setSaving(true);
    try {
      const syncedLines = syncSolarPanelsToLineItems(solar, lines);
      let nextConfig = syncLegacyPanelFieldsFromSolar({ ...config, solarPanels: solar });
      const layout: ProposalTemplateV1 = applyCommercialFlagsToLayout(
        getProposalLayout(pptInput),
        nextConfig
      );

      const pricingBody: Record<string, unknown> = {
        line_items: syncedLines,
        system_kw: solar.plantCapacityKw,
        manual_final_override: manualFinal,
      };
      if (manualFinal) pricingBody.final_amount_inr = manualFinalAmt;

      const prRes = await fetch(`/api/proposals/${proposalId}/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricingBody),
      });
      const prJson = (await prRes.json()) as { ok?: boolean; pricing?: ProposalPricingRow; error?: string };
      if (!prRes.ok || !prJson.ok || !prJson.pricing) {
        throw new Error(prJson.error || labels.saveFailed);
      }

      const cfgRes = await fetch(`/api/proposals/${proposalId}/commercial-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commercialConfig: nextConfig, proposalLayout: layout }),
      });
      const cfgJson = (await cfgRes.json()) as { ok?: boolean; error?: string };
      if (!cfgRes.ok || !cfgJson.ok) {
        throw new Error(cfgJson.error || "Commercial config save failed");
      }

      setPricing(prJson.pricing);
      setLines(hydrateLineItems(prJson.pricing));
      setConfig(nextConfig);
      onPricingSaved?.(prJson.pricing);
      onPptInputChange?.({
        ...pptInput,
        commercialConfig: nextConfig,
        proposalLayout: layout,
        systemKw: solar.plantCapacityKw,
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

  function applyTemplate(tpl: import("@/lib/commercial-pricing-templates").CommercialPricingTemplate) {
    setLines(tpl.lineItems);
    const cfg = ensureSolarPanelsInConfig(tpl.commercialConfig, tpl.systemKw);
    setConfig(cfg);
    const sp =
      cfg.solarPanels ?? solarPanelsFromLineItems(tpl.lineItems, tpl.systemKw) ?? defaultSolarPanels(tpl.systemKw);
    patchSolar(sp);
    toast.push({ tone: "success", title: "Template applied", description: tpl.name });
  }

  return (
    <div className="space-y-6">
      <CommercialPricingTemplatesPanel
        presetId="commercial_executive"
        systemKw={solar.plantCapacityKw}
        lineItems={syncSolarPanelsToLineItems(solar, lines)}
        commercialConfig={config}
        onApply={applyTemplate}
      />

      <CommercialSolarPanelSection solar={solar} onChange={patchSolar} />

      {config.dcrComparison?.enabled !== false ? <CommercialDcrPreview solar={solar} /> : null}

      <CommercialControlCenter
        config={config}
        summary={liveSummary}
        onChange={setConfig}
        onOpenReview={onOpenReview}
      />

      <CommercialHardwareBom
        lines={lines}
        onChange={setLines}
        labels={{
          title: "Hardware & services BOM",
          subtitle: "Inverter, structure, installation — drag to reorder · actions on the left rail",
          addLine: labels.addLine,
          removeLine: labels.removeLine,
        }}
      />

      <div className="sticky bottom-0 z-10 -mx-1 rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#0c1017]/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Gross</p>
              <p className="font-bold tabular-nums">₹{gross.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Net payable</p>
              <p className="font-bold tabular-nums text-teal-700 dark:text-teal-300">
                ₹{Math.round(net).toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Plant</p>
              <p className="font-bold tabular-nums">{solar.plantCapacityKw} kW</p>
            </div>
          </div>
          <Button type="button" size="default" className="min-w-[9rem] font-semibold" disabled={saving} onClick={() => void saveAll()}>
            {saving ? labels.saving : labels.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
