/**
 * ProposalDocument IR — canonical, render-agnostic intermediate representation.
 *
 * The Proposal OS compiler produces this structure from:
 *   preset + PremiumProposalPptInput + ProposalDeckSummary
 *
 * Consumers:
 *   - Web renderer  (proposal-view.tsx)
 *   - PPT renderer  (proposal-ppt.ts)
 *   - PDF renderer  (proposal-pdf.ts)
 *   - Snapshot engine (proposal-snapshot-store.ts)
 *
 * Architectural rules:
 *   - Backward compatible: existing ppt_input / summary flows continue to work.
 *   - Immutable once status = "sent" (pricing freezes via snapshot).
 *   - New fields are always optional — never a breaking change.
 *   - `raw_input` carries original PremiumProposalPptInput for legacy renderers.
 *     Will be deprecated when all renderers consume ProposalDocument natively.
 */

import type { ProposalPresetId } from "@/lib/proposal-preset-engine";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import type { ProposalLang } from "@/lib/proposal-i18n";

// ─── Customer context ────────────────────────────────────────────────────────

export type ProposalCustomer = {
  name: string;
  honored_name: string;
  location: string;
  state?: string;
  discom?: string;
  tariff_category?: string;
  connection_type?: string;
  connected_load_kw?: number;
  contract_demand_kva?: number;
};

// ─── Installer context ───────────────────────────────────────────────────────

export type ProposalInstaller = {
  name: string;
  tagline?: string;
  contact?: string;
  logo_url?: string;
};

// ─── Technical payload ───────────────────────────────────────────────────────

export type ProposalTechnical = {
  system_kw: number;
  panels: number;
  panel_brand: string;
  annual_generation_kwh: number;
  annual_saving_inr: number;
  yearly_bill_inr: number;
  after_solar_inr: number;
  payback_years: number;
  coverage_pct: number;
  /**
   * `bill`        — proposal was generated from uploaded bill / monthly units.
   * `requirement` — CRM sizing path; no bill; shows system-spec pages instead of bill audit.
   */
  data_source: "bill" | "requirement";
};

// ─── Commercial slice ────────────────────────────────────────────────────────

/**
 * Normalized commercial payload for a proposal.
 * When `is_frozen = true`, the numbers are immutable (snapshot has been created).
 * When `is_frozen = false`, these are live working-draft values.
 */
export type ProposalCommercialSlice = {
  gross_cost_inr: number;
  subsidy_inr: number;
  discount_inr: number;
  final_amount_inr: number;
  /** True once a "sent" snapshot has been recorded for this proposal. */
  is_frozen: boolean;
  /** Row ID in `proposal_pricing_snapshots` — set when `is_frozen = true`. */
  snapshot_id?: string;
  snapshot_version?: number;
};

// ─── ProposalDocument (the IR) ───────────────────────────────────────────────

/**
 * Canonical normalized document produced by the Proposal OS compiler.
 *
 * All new renderers and downstream consumers should accept this type.
 * Legacy renderers (PPT, PDF) continue to receive `raw_input` for compatibility.
 */
export type ProposalDocument = {
  /** Matches `proposals.id` — uuid. */
  proposal_id: string;
  /** Increments on each revision. Starts at 1. */
  document_version: number;
  /** Which preset was used to compose this document. */
  preset_id: ProposalPresetId;

  customer: ProposalCustomer;
  installer: ProposalInstaller;
  technical: ProposalTechnical;
  commercial: ProposalCommercialSlice;

  /** Ordered block playlist — controls section sequence and visibility. */
  layout: ProposalTemplateV1;

  lang: ProposalLang;
  generated_at: string;

  /**
   * Original `PremiumProposalPptInput` payload for legacy renderer compatibility.
   * Do not add new logic that reads this — use the typed fields above instead.
   * @deprecated Use `customer`, `technical`, `commercial` etc. for new code.
   */
  raw_input?: Record<string, unknown>;
};

// ─── Compiler ────────────────────────────────────────────────────────────────

import type { PremiumProposalPptInput, ProposalDeckSummary } from "@/lib/proposal-ppt";
import type { ProposalLang as _L } from "@/lib/proposal-i18n";
import { getPresetDefaultLayout, normalizePresetId } from "@/lib/proposal-preset-engine";
import { normalizeProposalTemplateV1, parseProposalTemplateV1 } from "@/lib/proposal-template-schema";

/**
 * Compiler — assembles a `ProposalDocument` from the preset identifier,
 * raw PPT input, and the derived summary.
 *
 * This is the single entry point that converts the existing ppt_input + summary
 * pattern into the normalized IR. Call this instead of constructing ProposalDocument
 * manually.
 */
export function compileProposalDocument(
  proposalId: string,
  input: PremiumProposalPptInput,
  summary: ProposalDeckSummary,
  options?: {
    presetId?: string;
    snapshotId?: string;
    snapshotVersion?: number;
    isFrozen?: boolean;
    documentVersion?: number;
  }
): ProposalDocument {
  const presetId = normalizePresetId(options?.presetId ?? null);

  // Resolve layout: use stored layout if valid, else fall back to preset default.
  const storedLayout = parseProposalTemplateV1(input.proposalLayout);
  const layout = storedLayout
    ? normalizeProposalTemplateV1(storedLayout)
    : getPresetDefaultLayout(presetId);

  const customer: ProposalCustomer = {
    name: input.customerName,
    honored_name: summary.honoredName,
    location: input.location ?? "",
    state: input.state,
    discom: input.discom,
    tariff_category: input.tariffCategory,
    connection_type: input.connectionType,
    connected_load_kw: input.connectedLoadKw,
    contract_demand_kva: input.contractDemandKva,
  };

  const installer: ProposalInstaller = {
    name: summary.installer,
    tagline: summary.tagline,
    contact: summary.contact,
    logo_url: input.installerLogoUrl,
  };

  const technical: ProposalTechnical = {
    system_kw: summary.systemKw,
    panels: summary.panels,
    panel_brand: summary.panelBrand,
    annual_generation_kwh: summary.annualGen,
    annual_saving_inr: summary.annualSaving,
    yearly_bill_inr: summary.yearlyBill,
    after_solar_inr: summary.afterSolar,
    payback_years: summary.paybackYears,
    coverage_pct: summary.coverage,
    data_source: input.dataSource ?? "bill",
  };

  const commercial: ProposalCommercialSlice = {
    gross_cost_inr: summary.grossSystemCost,
    subsidy_inr: summary.pmSubsidy,
    discount_inr: 0,
    final_amount_inr:
      typeof input.commercialNetPayableInr === "number" && input.commercialNetPayableInr >= 0
        ? input.commercialNetPayableInr
        : summary.netCost,
    is_frozen: options?.isFrozen ?? false,
    snapshot_id: options?.snapshotId,
    snapshot_version: options?.snapshotVersion,
  };

  return {
    proposal_id: proposalId,
    document_version: options?.documentVersion ?? 1,
    preset_id: presetId,
    customer,
    installer,
    technical,
    commercial,
    layout,
    lang: input.lang ?? "en",
    generated_at: new Date().toISOString(),
    raw_input: input as unknown as Record<string, unknown>,
  };
}
