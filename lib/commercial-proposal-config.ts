/**
 * Commercial proposal configuration — single JSONB shape on ppt_input.
 */

import { z } from "zod";
import { buildDefaultScenarios } from "@/lib/commercial-capacity-scenarios";
import type { ProposalBlockId } from "@/lib/proposal-block-registry";
import type { OrgType } from "@/lib/org-type-defaults";
import type { StoryMode } from "@/lib/proposal-story-copy";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";

export const panelTypeSchema = z.enum(["DCR", "NON_DCR"]);

export const commercialPanelConfigSchema = z.object({
  catalogId: z.string().max(80),
  brandId: z.string().max(40).optional(),
  watt: z.number().min(100).max(800).optional(),
  panelType: panelTypeSchema.optional(),
  /** Installer override ₹/Wp */
  ratePerWpInr: z.number().min(0).max(500).optional(),
  /** Cell technology — Mono PERC, TOPCon, etc. */
  technology: z.string().max(80).optional(),
});

export const dcrComparisonConfigSchema = z.object({
  enabled: z.boolean().default(true),
  brandId: z.string().max(40).optional(),
  watt: z.number().min(100).max(800).optional(),
});

export const capacityScenarioSchema = z.object({
  id: z.string().max(40),
  label: z.string().max(80),
  systemKw: z.number().min(1).max(10000),
  isRecommended: z.boolean().optional(),
});

export const capacityScenariosConfigSchema = z.object({
  enabled: z.boolean().default(true),
  scenarios: z.array(capacityScenarioSchema).min(1).max(5),
  recommendedId: z.string().max(40).optional(),
});

export const commercialFinancingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  interestRatePct: z.number().min(0).max(40).optional(),
  tenuresYears: z.array(z.number().int().min(1).max(25)).max(6).optional(),
  selectedTenureYears: z.number().int().min(1).max(25).optional(),
  downPaymentInr: z.number().min(0).optional(),
  lenderLabel: z.string().max(120).optional(),
});

export const commercialProposalConfigSchema = z.object({
  panel: commercialPanelConfigSchema.optional(),
  dcrComparison: dcrComparisonConfigSchema.optional(),
  capacityScenarios: capacityScenariosConfigSchema.optional(),
  financing: commercialFinancingConfigSchema.optional(),
  orgType: z
    .enum(["hotel", "hospital", "factory", "warehouse", "dairy", "school", "mall", "office", "industry", "generic"])
    .optional(),
  storyMode: z
    .enum(["executive_pitch", "cfo_brief", "operations_brief", "sustainability_story"])
    .optional(),
  /** Inverter phase for BOM specification */
  inverterPhase: z.enum(["single", "three"]).optional(),
});

export type CommercialProposalConfig = z.infer<typeof commercialProposalConfigSchema>;
export type CommercialPanelConfig = z.infer<typeof commercialPanelConfigSchema>;
export type CapacityScenarioInput = z.infer<typeof capacityScenarioSchema>;

export function parseCommercialConfig(raw: unknown): CommercialProposalConfig | null {
  const parsed = commercialProposalConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function defaultCommercialConfig(
  systemKw: number,
  catalogId = "waaree-540-dcr"
): CommercialProposalConfig {
  const scenarios = buildDefaultScenarios(systemKw);
  return {
    panel: { catalogId },
    dcrComparison: { enabled: true, brandId: "waaree", watt: 540 },
    capacityScenarios: {
      enabled: true,
      scenarios,
      recommendedId: "primary",
    },
    financing: {
      enabled: true,
      interestRatePct: 9.5,
      tenuresYears: [5, 7, 10],
      selectedTenureYears: 7,
      downPaymentInr: 0,
      lenderLabel: "NBFC / Bank partner",
    },
  };
}

/** Type-safe org + story without circular import at runtime */
export function withOrgStory(
  config: CommercialProposalConfig,
  orgType?: OrgType,
  storyMode?: StoryMode
): CommercialProposalConfig {
  return {
    ...config,
    ...(orgType ? { orgType } : {}),
    ...(storyMode ? { storyMode } : {}),
  };
}

/** Sync optional commercial block toggles from feature flags into layout. */
export function applyCommercialFlagsToLayout(
  layout: ProposalTemplateV1,
  config: CommercialProposalConfig
): ProposalTemplateV1 {
  const flags: Partial<Record<ProposalBlockId, boolean>> = {
    dcr_comparison_card: config.dcrComparison?.enabled !== false,
    capacity_scenarios_card: config.capacityScenarios?.enabled !== false,
    commercial_financing_card: config.financing?.enabled === true,
  };

  return {
    ...layout,
    blocks: layout.blocks.map((b) =>
      flags[b.id] !== undefined ? { ...b, enabled: flags[b.id]! } : b
    ),
  };
}
