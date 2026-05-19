"use client";

import { useEffect, useState } from "react";
import {
  defaultCommercialConfig,
  parseCommercialConfig,
  type CommercialProposalConfig,
} from "@/lib/commercial-proposal-config";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import { CommercialIntelligenceModule } from "@/components/workspace/commercial/commercial-intelligence-module";
import { CommercialWorkspaceShell } from "@/components/workspace/commercial/commercial-workspace-shell";

type Section = "panel" | "scenarios" | "financing";

const META: Record<
  Section,
  { title: string; subtitle: string }
> = {
  panel: {
    title: "Panel & Pricing",
    subtitle: "DCR / Non-DCR registry, brands, wattage, ₹/Wp rates, and inverter phase.",
  },
  scenarios: {
    title: "Capacity Scenarios",
    subtitle: "Executive kW options, recommendations, and comparison cards for the deck.",
  },
  financing: {
    title: "Financing & EMI",
    subtitle: "Lender presets, interest, tenure, and down payment for presentation-ready EMI tables.",
  },
};

type Props = {
  proposalId: string;
  section: Section;
  systemKw: number;
  initialConfig: unknown;
  proposalLayout?: ProposalTemplateV1;
  onSaved: (config: CommercialProposalConfig, layout?: ProposalTemplateV1) => void;
};

export function WorkspaceCommercialTab({
  proposalId,
  section,
  systemKw,
  initialConfig,
  proposalLayout,
  onSaved,
}: Props) {
  const [config, setConfig] = useState<CommercialProposalConfig>(() =>
    parseCommercialConfig(initialConfig) ?? defaultCommercialConfig(systemKw)
  );

  useEffect(() => {
    const parsed = parseCommercialConfig(initialConfig);
    if (parsed) setConfig(parsed);
  }, [initialConfig]);

  const meta = META[section];

  return (
    <CommercialWorkspaceShell
      proposalId={proposalId}
      title={meta.title}
      subtitle={meta.subtitle}
      config={config}
      proposalLayout={proposalLayout}
      onSaved={onSaved}
    >
      <CommercialIntelligenceModule
        systemKw={systemKw}
        config={config}
        onChange={setConfig}
        workspaceSection={section}
      />
    </CommercialWorkspaceShell>
  );
}
