/**
 * Modular proposal sections — dynamic engine building blocks (not static PDF pages).
 * Toggle + order = `proposalLayout` on `PremiumProposalPptInput` (see proposal-template-schema.ts).
 *
 * Workflow patterns distilled from typical EPC quotations: letter/cover → about → technical narrative →
 * BOM/spec table → commercial → ROI/generation → warranty → payment → terms → gallery → client checklist → AMC.
 */

import { z } from "zod";

export const PROPOSAL_BLOCK_IDS = [
  "cover_page",
  "about_company",
  "technical_proposal",
  "technical_specifications",
  "bom_material_list",
  "financial_summary",
  "roi_savings",
  "warranty",
  "payment_terms",
  "terms_conditions",
  "project_gallery",
  "customer_documents_required",
  "amc_maintenance"
] as const;

export type ProposalBlockId = (typeof PROPOSAL_BLOCK_IDS)[number];

export const proposalBlockIdSchema = z.enum(PROPOSAL_BLOCK_IDS);

export type ProposalBlockMeta = {
  id: ProposalBlockId;
  /** i18n key under lib/i18n-messages (EN) */
  labelKey: string;
  /** For future UI grouping */
  group: "intro" | "technical" | "commercial" | "legal" | "media" | "service";
  /** Sensible default for new templates */
  defaultEnabled: boolean;
};

export const PROPOSAL_BLOCK_REGISTRY: Record<ProposalBlockId, ProposalBlockMeta> = {
  cover_page: { id: "cover_page", labelKey: "proposal_block_cover_page", group: "intro", defaultEnabled: true },
  about_company: { id: "about_company", labelKey: "proposal_block_about_company", group: "intro", defaultEnabled: true },
  technical_proposal: {
    id: "technical_proposal",
    labelKey: "proposal_block_technical_proposal",
    group: "technical",
    defaultEnabled: true
  },
  technical_specifications: {
    id: "technical_specifications",
    labelKey: "proposal_block_technical_specifications",
    group: "technical",
    defaultEnabled: true
  },
  bom_material_list: { id: "bom_material_list", labelKey: "proposal_block_bom", group: "technical", defaultEnabled: true },
  financial_summary: { id: "financial_summary", labelKey: "proposal_block_financial", group: "commercial", defaultEnabled: true },
  roi_savings: { id: "roi_savings", labelKey: "proposal_block_roi", group: "commercial", defaultEnabled: true },
  warranty: { id: "warranty", labelKey: "proposal_block_warranty", group: "legal", defaultEnabled: true },
  payment_terms: { id: "payment_terms", labelKey: "proposal_block_payment", group: "commercial", defaultEnabled: true },
  terms_conditions: { id: "terms_conditions", labelKey: "proposal_block_terms", group: "legal", defaultEnabled: true },
  project_gallery: { id: "project_gallery", labelKey: "proposal_block_gallery", group: "media", defaultEnabled: true },
  customer_documents_required: {
    id: "customer_documents_required",
    labelKey: "proposal_block_customer_docs",
    group: "service",
    defaultEnabled: true
  },
  amc_maintenance: { id: "amc_maintenance", labelKey: "proposal_block_amc", group: "service", defaultEnabled: true }
};

/** Default narrative order (reorderable via template). */
export const DEFAULT_PROPOSAL_BLOCK_ORDER: ProposalBlockId[] = [
  "cover_page",
  "about_company",
  "technical_proposal",
  "technical_specifications",
  "bom_material_list",
  "financial_summary",
  "roi_savings",
  "warranty",
  "payment_terms",
  "terms_conditions",
  "project_gallery",
  "customer_documents_required",
  "amc_maintenance"
];
