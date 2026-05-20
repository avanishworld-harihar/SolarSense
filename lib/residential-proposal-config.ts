/**
 * Residential requirement config — parse, defaults, layout flags.
 */

import type { ProposalBlockId } from "@/lib/proposal-block-registry";
import {
  defaultResidentialConfig,
  residentialProposalConfigSchema,
  type ResidentialProposalConfig,
} from "@/lib/residential-requirements-schema";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";

export { residentialProposalConfigSchema, defaultResidentialConfig };
export type { ResidentialProposalConfig };

export function parseResidentialConfig(raw: unknown): ResidentialProposalConfig | null {
  const parsed = residentialProposalConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Toggle proposal blocks from residential requirement flags (EMI, subsidy, requirement path). */
export function applyResidentialFlagsToLayout(
  layout: ProposalTemplateV1,
  config: ResidentialProposalConfig
): ProposalTemplateV1 {
  const fin = config.financing;
  const sub = config.subsidy;

  const flags: Partial<Record<ProposalBlockId, boolean>> = {
    system_requirements: config.inputMode === "requirement",
    commercial_financing_card: fin?.enabled === true,
    payment_terms: fin?.enabled !== false,
    financial_summary: sub?.preference !== "none",
    brand_comparison_card: false,
    dcr_comparison_card: false,
    capacity_scenarios_card: false,
    executive_summary: false,
    payback_analysis: false,
  };

  return {
    ...layout,
    blocks: layout.blocks.map((b) =>
      flags[b.id] !== undefined ? { ...b, enabled: flags[b.id]! } : b
    ),
  };
}
