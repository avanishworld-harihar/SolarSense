"use client";

import { useEffect, useState } from "react";
import {
  defaultCommercialConfig,
  parseCommercialConfig,
  type CommercialProposalConfig,
} from "@/lib/commercial-proposal-config";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import { CommercialNarrativePanel } from "@/components/commercial/commercial-narrative-panel";
import { CommercialWorkspaceShell } from "@/components/workspace/commercial/commercial-workspace-shell";

type Props = {
  proposalId: string;
  systemKw: number;
  initialConfig: unknown;
  proposalLayout?: ProposalTemplateV1;
  onSaved: (config: CommercialProposalConfig, layout?: ProposalTemplateV1) => void;
};

export function WorkspaceCommercialConfigTab({
  proposalId,
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

  return (
    <CommercialWorkspaceShell
      proposalId={proposalId}
      title="Commercial Config"
      subtitle="Organization profile, narrative tone, DG assumptions, and deck section visibility — executive layer only."
      config={config}
      proposalLayout={proposalLayout}
      onSaved={onSaved}
    >
      <CommercialNarrativePanel config={config} onChange={setConfig} />
    </CommercialWorkspaceShell>
  );
}
