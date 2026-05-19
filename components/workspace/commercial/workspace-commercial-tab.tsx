"use client";

import { useEffect, useState } from "react";
import {
  defaultCommercialConfig,
  parseCommercialConfig,
  type CommercialProposalConfig,
} from "@/lib/commercial-proposal-config";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import { summarizeProposalDeck, type PremiumProposalPptInput } from "@/lib/proposal-ppt";
import { CommercialIntelligenceModule } from "@/components/workspace/commercial/commercial-intelligence-module";
import { CommercialWorkspaceShell } from "@/components/workspace/commercial/commercial-workspace-shell";
import { WorkspaceCommercialConfigTab } from "@/components/workspace/commercial/workspace-commercial-config-tab";
import { WorkspacePanelPricingRegistry } from "@/components/workspace/commercial/workspace-panel-pricing-registry";
import { WorkspaceCapacityScenariosModule } from "@/components/workspace/commercial/workspace-capacity-scenarios-module";

export type WorkspaceCommercialSection =
  | "commercial_config"
  | "panel"
  | "scenarios"
  | "financing";

const META: Record<WorkspaceCommercialSection, { title: string; subtitle: string }> = {
  commercial_config: {
    title: "Commercial Config",
    subtitle: "Executive storytelling and presentation controls.",
  },
  panel: {
    title: "Panel & Pricing",
    subtitle: "DCR and Non-DCR pricing intelligence registries with live plant comparison.",
  },
  scenarios: {
    title: "Capacity Scenarios",
    subtitle: "Multi-kW executive options with ROI, generation, and recommendation.",
  },
  financing: {
    title: "Financing & EMI",
    subtitle: "Banking-grade financing presets for the commercial deck.",
  },
};

type Props = {
  proposalId: string;
  section: WorkspaceCommercialSection;
  systemKw: number;
  pptInput: PremiumProposalPptInput;
  initialConfig: unknown;
  proposalLayout?: ProposalTemplateV1;
  onSaved: (config: CommercialProposalConfig, layout?: ProposalTemplateV1) => void;
};

export function WorkspaceCommercialTab(props: Props) {
  if (props.section === "commercial_config") {
    return (
      <WorkspaceCommercialConfigTab
        proposalId={props.proposalId}
        systemKw={props.systemKw}
        initialConfig={props.initialConfig}
        proposalLayout={props.proposalLayout}
        onSaved={props.onSaved}
      />
    );
  }

  return <WorkspaceCommercialIntelligenceTab {...props} />;
}

function WorkspaceCommercialIntelligenceTab({
  proposalId,
  section,
  systemKw,
  pptInput,
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

  const summary = summarizeProposalDeck(pptInput);
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
      {section === "panel" && (
        <WorkspacePanelPricingRegistry
          systemKw={systemKw}
          summary={summary}
          config={config}
          onChange={setConfig}
        />
      )}
      {section === "scenarios" && (
        <WorkspaceCapacityScenariosModule
          systemKw={systemKw}
          summary={summary}
          config={config}
          onChange={setConfig}
        />
      )}
      {section === "financing" && (
        <CommercialIntelligenceModule
          systemKw={systemKw}
          config={config}
          onChange={setConfig}
          workspaceSection="financing"
        />
      )}
    </CommercialWorkspaceShell>
  );
}

// section is narrowed after commercial_config guard in parent export
