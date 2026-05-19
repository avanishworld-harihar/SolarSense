/**
 * Modular proposal sections — dynamic engine building blocks (not static PDF pages).
 * Toggle + order = `proposalLayout` on `PremiumProposalPptInput` (see proposal-template-schema.ts).
 *
 * Workflow patterns distilled from typical EPC quotations: letter/cover → about → technical narrative →
 * BOM/spec table → commercial → ROI/generation → warranty → payment → terms → gallery → client checklist → AMC.
 *
 * Phase A additions:
 *   - `preset_affinity` — which presets include this block by default.
 *   - `executive_summary` — high-level impact block for C&I proposals.
 *   - `system_requirements` — requirement-based path (no bill); shows sizing, generation, specs.
 *   - `payback_analysis` — NPV / IRR detail block for commercial decision-makers.
 */

import { z } from "zod";

export const PROPOSAL_BLOCK_IDS = [
  "cover_page",
  "about_company",
  "executive_summary",
  "technical_proposal",
  "system_requirements",
  "technical_specifications",
  "bom_material_list",
  "financial_summary",
  "roi_savings",
  "payback_analysis",
  "warranty",
  "payment_terms",
  "terms_conditions",
  "project_gallery",
  "customer_documents_required",
  "amc_maintenance",
  /** Wave 3 P7 — side-by-side panel/inverter brand comparison. Commercial preset optional block. */
  "brand_comparison_card",
  /** C&I — DCR vs NON-DCR cost comparison */
  "dcr_comparison_card",
  /** C&I — multi-kW capacity scenario comparison */
  "capacity_scenarios_card",
  /** C&I — EMI / financing scenarios */
  "commercial_financing_card",
] as const;

export type ProposalBlockId = (typeof PROPOSAL_BLOCK_IDS)[number];

export const proposalBlockIdSchema = z.enum(PROPOSAL_BLOCK_IDS);

export type ProposalBlockGroup =
  | "intro"
  | "technical"
  | "commercial"
  | "legal"
  | "media"
  | "service";

/**
 * Which presets use this block in their default playlist.
 * `"all"` = every preset enables it by default.
 * An array = only those specific presets include it by default.
 */
export type PresetAffinity = "all" | ReadonlyArray<"residential_smart" | "commercial_executive">;

export type ProposalBlockMeta = {
  id: ProposalBlockId;
  /** i18n key under lib/i18n-messages (EN) */
  labelKey: string;
  /** For future UI grouping */
  group: ProposalBlockGroup;
  /** Sensible default for new templates (applies when no preset is selected) */
  defaultEnabled: boolean;
  /**
   * Which presets enable this block by default.
   * Used by the preset engine to build `getPresetDefaultLayout()`.
   * `"all"` — enabled in all presets by default.
   * Array — only enabled for the listed presets.
   */
  preset_affinity: PresetAffinity;
  /**
   * When true, this block only renders when `dataSource = "requirement"`.
   * (i.e. no bill uploaded — system-spec path.)
   */
  requirement_path_only?: boolean;
};

export const PROPOSAL_BLOCK_REGISTRY: Record<ProposalBlockId, ProposalBlockMeta> = {
  cover_page: {
    id: "cover_page",
    labelKey: "proposal_block_cover_page",
    group: "intro",
    defaultEnabled: true,
    preset_affinity: "all",
  },

  about_company: {
    id: "about_company",
    labelKey: "proposal_block_about_company",
    group: "intro",
    defaultEnabled: true,
    preset_affinity: "all",
  },

  /**
   * High-level executive impact block for C&I proposals.
   * Leads with the commercial headline: savings, payback, ROI — in one screen.
   * Designed for decision-makers who skip technical detail.
   */
  executive_summary: {
    id: "executive_summary",
    labelKey: "proposal_block_executive_summary",
    group: "intro",
    defaultEnabled: false,
    preset_affinity: ["commercial_executive"],
  },

  technical_proposal: {
    id: "technical_proposal",
    labelKey: "proposal_block_technical_proposal",
    group: "technical",
    defaultEnabled: true,
    preset_affinity: "all",
  },

  /**
   * System requirement block — shown instead of bill audit pages
   * when no bill was uploaded (dataSource = "requirement").
   * Shows: sizing rationale, annual generation, peak demand coverage, specs.
   */
  system_requirements: {
    id: "system_requirements",
    labelKey: "proposal_block_system_requirements",
    group: "technical",
    defaultEnabled: false,
    preset_affinity: ["commercial_executive"],
    requirement_path_only: true,
  },

  technical_specifications: {
    id: "technical_specifications",
    labelKey: "proposal_block_technical_specifications",
    group: "technical",
    defaultEnabled: true,
    preset_affinity: "all",
  },

  bom_material_list: {
    id: "bom_material_list",
    labelKey: "proposal_block_bom",
    group: "technical",
    defaultEnabled: true,
    preset_affinity: "all",
  },

  financial_summary: {
    id: "financial_summary",
    labelKey: "proposal_block_financial",
    group: "commercial",
    defaultEnabled: true,
    preset_affinity: "all",
  },

  roi_savings: {
    id: "roi_savings",
    labelKey: "proposal_block_roi",
    group: "commercial",
    defaultEnabled: true,
    preset_affinity: "all",
  },

  /**
   * Detailed NPV / IRR / payback analysis for commercial decision-makers.
   * Goes beyond the standard roi_savings block with multi-year cashflow table.
   */
  payback_analysis: {
    id: "payback_analysis",
    labelKey: "proposal_block_payback_analysis",
    group: "commercial",
    defaultEnabled: false,
    preset_affinity: ["commercial_executive"],
  },

  warranty: {
    id: "warranty",
    labelKey: "proposal_block_warranty",
    group: "legal",
    defaultEnabled: true,
    preset_affinity: "all",
  },

  payment_terms: {
    id: "payment_terms",
    labelKey: "proposal_block_payment",
    group: "commercial",
    defaultEnabled: true,
    preset_affinity: "all",
  },

  terms_conditions: {
    id: "terms_conditions",
    labelKey: "proposal_block_terms",
    group: "legal",
    defaultEnabled: true,
    preset_affinity: "all",
  },

  project_gallery: {
    id: "project_gallery",
    labelKey: "proposal_block_gallery",
    group: "media",
    defaultEnabled: true,
    preset_affinity: "all",
  },

  customer_documents_required: {
    id: "customer_documents_required",
    labelKey: "proposal_block_customer_docs",
    group: "service",
    defaultEnabled: true,
    preset_affinity: ["residential_smart"],
  },

  amc_maintenance: {
    id: "amc_maintenance",
    labelKey: "proposal_block_amc",
    group: "service",
    defaultEnabled: true,
    preset_affinity: "all",
  },

  /**
   * Wave 3 P7 — Brand comparison card.
   * Side-by-side comparison of panel + inverter brands with key specs.
   * Local-only data from lib/brand-metadata.ts — no marketplace coupling.
   * Commercial preset optional block; disabled by default.
   */
  brand_comparison_card: {
    id: "brand_comparison_card",
    labelKey: "proposal_block_brand_comparison",
    group: "technical",
    defaultEnabled: false,
    preset_affinity: ["commercial_executive"],
  },

  dcr_comparison_card: {
    id: "dcr_comparison_card",
    labelKey: "proposal_block_dcr_comparison",
    group: "commercial",
    defaultEnabled: true,
    preset_affinity: ["commercial_executive"],
  },

  capacity_scenarios_card: {
    id: "capacity_scenarios_card",
    labelKey: "proposal_block_capacity_scenarios",
    group: "commercial",
    defaultEnabled: true,
    preset_affinity: ["commercial_executive"],
  },

  commercial_financing_card: {
    id: "commercial_financing_card",
    labelKey: "proposal_block_commercial_financing",
    group: "commercial",
    defaultEnabled: false,
    preset_affinity: ["commercial_executive"],
  },
};

/** Default narrative order used when no preset is active. Maintains backward compatibility. */
export const DEFAULT_PROPOSAL_BLOCK_ORDER: ProposalBlockId[] = [
  "cover_page",
  "about_company",
  "executive_summary",
  "technical_proposal",
  "system_requirements",
  "technical_specifications",
  "bom_material_list",
  "financial_summary",
  "roi_savings",
  "payback_analysis",
  "warranty",
  "payment_terms",
  "terms_conditions",
  "project_gallery",
  "customer_documents_required",
  "amc_maintenance",
  "brand_comparison_card",
  "dcr_comparison_card",
  "capacity_scenarios_card",
  "commercial_financing_card",
];
