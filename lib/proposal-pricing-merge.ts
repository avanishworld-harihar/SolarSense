import type { PremiumProposalPptInput, ProposalDeckSummary } from "@/lib/proposal-ppt";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import { computeGrossSystemCostInr } from "@/lib/solar-engine";
import { computePmSuryaGharSubsidy } from "@/lib/proposal-deck-helpers";
import { defaultCommercialPanelLineItems } from "@/lib/commercial-bom-panels";
import {
  defaultLineItemsFromSeed,
  proposalPricingRowFromLineItems
} from "@/lib/proposal-pricing-lines";
import type { ProposalPricingPatch, ProposalPricingRow } from "@/lib/proposal-pricing-schema";

/** Subtotal before central subsidy: hardware + installation + structure. */
export function grossSubtotalInr(row: Pick<ProposalPricingRow, "hardware_inr" | "installation_inr" | "structure_inr">): number {
  return Math.round(
    Math.max(0, Number(row.hardware_inr) || 0) +
      Math.max(0, Number(row.installation_inr) || 0) +
      Math.max(0, Number(row.structure_inr) || 0)
  );
}

/**
 * Auto final when not manually overridden:
 * hardware + installation + structure − subsidy − discount (floored at 0).
 */
export function computedFinalAmountInr(
  row: Pick<
    ProposalPricingRow,
    "hardware_inr" | "installation_inr" | "structure_inr" | "subsidy_inr" | "discount_inr" | "manual_final_override" | "final_amount_inr"
  >
): number {
  if (row.manual_final_override) return Math.max(0, Math.round(Number(row.final_amount_inr) || 0));
  const base =
    grossSubtotalInr(row) - Math.max(0, Number(row.subsidy_inr) || 0) - Math.max(0, Number(row.discount_inr) || 0);
  return Math.max(0, Math.round(base));
}

/** kW → W-peak for ₹/W math. */
export function wattsFromSystemKw(systemKw: number): number {
  const kw = Math.max(0, Number(systemKw) || 0);
  return Math.round(kw * 1000);
}

export function hardwareFromPerWatt(systemKw: number, pricePerWattInr: number): number {
  const w = wattsFromSystemKw(systemKw);
  const ppw = Math.max(0, Number(pricePerWattInr) || 0);
  return Math.round(w * ppw);
}

/**
 * Seed pricing from an existing deck input + summary (used right after `createProposal`).
 */
export type ProposalPricingInsert = Omit<ProposalPricingRow, "id" | "updated_at">;

export function defaultProposalPricingFromDeck(
  proposalId: string,
  ppt: PremiumProposalPptInput,
  summary: ProposalDeckSummary,
  opts?: { presetId?: string | null }
): ProposalPricingInsert {
  const systemKw = Math.max(0, Number(ppt.systemKw) || 0);
  const gross = Math.max(
    0,
    Math.round(Number(ppt.grossSystemCostInr ?? summary.grossSystemCost ?? computeGrossSystemCostInr(systemKw)) || 0)
  );
  const subsidy = Math.max(
    0,
    Math.round(Number(ppt.pmSuryaGharSubsidyInr ?? summary.pmSubsidy ?? computePmSuryaGharSubsidy(systemKw)) || 0)
  );
  const finalAmt = Math.max(0, Math.round(Number(summary.netCost) || 0));
  const w = wattsFromSystemKw(systemKw);
  const pricePerWatt = w > 0 ? Math.round((gross / w) * 10000) / 10000 : 0;

  const panelBrandHint = typeof ppt.panelBrand === "string" ? ppt.panelBrand : null;
  const line_items =
    opts?.presetId === "commercial_executive"
      ? defaultCommercialPanelLineItems({
          hardware_inr: gross,
          installation_inr: 0,
          structure_inr: 0,
          subsidy_inr: subsidy,
          discount_inr: 0,
          system_kw: systemKw,
          panelBrandHint,
        })
      : defaultLineItemsFromSeed({
          hardware_inr: gross,
          installation_inr: 0,
          structure_inr: 0,
          subsidy_inr: subsidy,
          discount_inr: 0,
          panelBrandHint,
        });

  return {
    proposal_id: proposalId,
    system_kw: systemKw,
    price_per_watt_inr: pricePerWatt,
    hardware_inr: gross,
    installation_inr: 0,
    structure_inr: 0,
    subsidy_inr: subsidy,
    discount_inr: 0,
    final_amount_inr: finalAmt,
    manual_final_override: false,
    line_items
  };
}

/** Apply DB pricing onto `ppt_input` so `summarizeProposalDeck` stays the single summarizer. */
export function mergeProposalPricingIntoPptInput(
  ppt: PremiumProposalPptInput,
  pricing: ProposalPricingRow | null
): PremiumProposalPptInput {
  if (!pricing) return ppt;
  const grossDisplay = grossSubtotalInr(pricing);
  const finalNet = pricing.manual_final_override
    ? Math.max(0, Math.round(pricing.final_amount_inr))
    : computedFinalAmountInr(pricing);

  return {
    ...ppt,
    systemKw: pricing.system_kw > 0 ? pricing.system_kw : ppt.systemKw,
    grossSystemCostInr: grossDisplay > 0 ? grossDisplay : ppt.grossSystemCostInr,
    pmSuryaGharSubsidyInr: Math.max(0, Math.round(pricing.subsidy_inr)),
    commercialNetPayableInr: finalNet
  };
}

export function liveSummaryWithPricing(
  ppt: PremiumProposalPptInput,
  pricing: ProposalPricingRow | null
): ProposalDeckSummary {
  return summarizeProposalDeck(mergeProposalPricingIntoPptInput(ppt, pricing));
}

/** Persisted JSON merge for `proposals.ppt_input` after pricing edits. */
export function pptInputJsonWithPricingSync(ppt: PremiumProposalPptInput, pricing: ProposalPricingRow): Record<string, unknown> {
  const merged = mergeProposalPricingIntoPptInput(ppt, pricing);
  return { ...merged, commercialNetPayableInr: merged.commercialNetPayableInr } as unknown as Record<string, unknown>;
}

/** Merge API patch + recompute hardware/final when appropriate. */
export function applyProposalPricingPatch(current: ProposalPricingRow, patch: ProposalPricingPatch): ProposalPricingRow {
  if (patch.line_items && patch.line_items.length > 0) {
    return proposalPricingRowFromLineItems(current, patch.line_items, {
      system_kw: patch.system_kw,
      manual_final_override: patch.manual_final_override,
      final_amount_inr: patch.final_amount_inr
    });
  }

  const next: ProposalPricingRow = {
    ...current,
    system_kw: patch.system_kw ?? current.system_kw,
    price_per_watt_inr: patch.price_per_watt_inr ?? current.price_per_watt_inr,
    hardware_inr: patch.hardware_inr ?? current.hardware_inr,
    installation_inr: patch.installation_inr ?? current.installation_inr,
    structure_inr: patch.structure_inr ?? current.structure_inr,
    subsidy_inr: patch.subsidy_inr ?? current.subsidy_inr,
    discount_inr: patch.discount_inr ?? current.discount_inr,
    final_amount_inr: patch.final_amount_inr ?? current.final_amount_inr,
    manual_final_override: patch.manual_final_override ?? current.manual_final_override
  };

  const touchedPpwOrKw = patch.price_per_watt_inr != null || patch.system_kw != null;
  if (patch.hardware_inr === undefined && touchedPpwOrKw) {
    next.hardware_inr = hardwareFromPerWatt(next.system_kw, next.price_per_watt_inr);
  }

  if (!next.manual_final_override) {
    next.final_amount_inr = computedFinalAmountInr(next);
  } else if (patch.final_amount_inr != null) {
    next.final_amount_inr = Math.max(0, Math.round(patch.final_amount_inr));
  }

  const gross = grossSubtotalInr(next);
  const w = wattsFromSystemKw(next.system_kw);
  if (w > 0) {
    next.price_per_watt_inr = Math.round((gross / w) * 10000) / 10000;
  }

  return next;
}
