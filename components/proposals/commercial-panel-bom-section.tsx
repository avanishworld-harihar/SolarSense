"use client";

import { useMemo, useState } from "react";
import {
  defaultCommercialConfig,
  parseCommercialConfig,
  type CommercialProposalConfig,
} from "@/lib/commercial-proposal-config";
import { resolvePanelQuote } from "@/lib/commercial-panel-catalog";
import { getProposalLayout } from "@/lib/proposal-layout-merge";
import type { PremiumProposalPptInput } from "@/lib/proposal-ppt";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import { CommercialWorkspaceShell } from "@/components/workspace/commercial/commercial-workspace-shell";
import { WorkspacePanelPricingRegistry } from "@/components/workspace/commercial/workspace-panel-pricing-registry";

type Props = {
  proposalId: string;
  pptInput: PremiumProposalPptInput;
  onPptInputChange: (next: PremiumProposalPptInput) => void;
};

export function CommercialPanelBomSection({ proposalId, pptInput, onPptInputChange }: Props) {
  const summary = useMemo(() => summarizeProposalDeck(pptInput), [pptInput]);
  const systemKw = summary.systemKw;

  const [config, setConfig] = useState<CommercialProposalConfig>(() => {
    return parseCommercialConfig(pptInput.commercialConfig) ?? defaultCommercialConfig(systemKw);
  });

  const proposalLayout = useMemo(() => getProposalLayout(pptInput), [pptInput]);

  const dcrId = config.panelRegistry?.selectedDcrCatalogId ?? "waaree-540-dcr";
  const nonId = config.panelRegistry?.selectedNonDcrCatalogId ?? "waaree-540-non-dcr";
  const dcrQuote = resolvePanelQuote(systemKw, dcrId, config.panel?.ratePerWpInr);
  const nonQuote = resolvePanelQuote(systemKw, nonId);

  function handleSaved(nextConfig: CommercialProposalConfig, layout?: ProposalTemplateV1) {
    setConfig(nextConfig);
    onPptInputChange({
      ...pptInput,
      commercialConfig: nextConfig,
      ...(layout ? { proposalLayout: layout } : {}),
    });
  }

  return (
    <CommercialWorkspaceShell
      proposalId={proposalId}
      title="Panel pricing — DCR & Non-DCR"
      subtitle="Brand, wattage, ₹/Wp, and technology drive module count and BOM hardware for this plant."
      config={config}
      proposalLayout={proposalLayout}
      onSaved={handleSaved}
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <PlantSizingChip
          label="DCR plant (selected)"
          modules={dcrQuote?.moduleCount}
          kw={dcrQuote?.systemKw}
          watt={dcrQuote?.entry.watt}
        />
        <PlantSizingChip
          label="Non-DCR plant (selected)"
          modules={nonQuote?.moduleCount}
          kw={nonQuote?.systemKw}
          watt={nonQuote?.entry.watt}
        />
      </div>
      <WorkspacePanelPricingRegistry
        systemKw={systemKw}
        summary={summary}
        config={config}
        onChange={setConfig}
      />
    </CommercialWorkspaceShell>
  );
}

function PlantSizingChip({
  label,
  modules,
  kw,
  watt,
}: {
  label: string;
  modules?: number;
  kw?: number;
  watt?: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
        {modules != null && kw != null && watt != null
          ? `${modules} modules · ${kw.toFixed(2)} kW @ ${watt}W`
          : "Select a module below"}
      </p>
    </div>
  );
}
