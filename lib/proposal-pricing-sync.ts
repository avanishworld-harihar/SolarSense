import {
  ensureCommercialPanelLines,
  syncCommercialConfigFromPanelLines,
} from "@/lib/commercial-bom-panels";
import {
  applyCommercialFlagsToLayout,
  defaultCommercialConfig,
  parseCommercialConfig,
  type CommercialProposalConfig,
} from "@/lib/commercial-proposal-config";
import type { PremiumProposalPptInput } from "@/lib/proposal-ppt";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import { mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import { normalizeLineItems } from "@/lib/proposal-pricing-lines";
import { getProposalPricingByProposalId } from "@/lib/proposal-pricing-store";
import {
  normalizeProposalTemplateV1,
  type ProposalTemplateV1,
} from "@/lib/proposal-template-schema";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import { getProposalById } from "@/lib/proposals-store";

async function persistMergedProposalDeck(proposalId: string, mergedPpt: PremiumProposalPptInput): Promise<boolean> {
  const client = createSupabaseAdmin() ?? supabase;
  if (!client) return false;
  const liveSummary = summarizeProposalDeck(mergedPpt);
  const { error } = await client
    .from("proposals")
    .update({
      system_kw: mergedPpt.systemKw,
      gross_system_cost_inr: liveSummary.grossSystemCost,
      pm_subsidy_inr: liveSummary.pmSubsidy,
      net_cost_inr: liveSummary.netCost,
      payback_years: liveSummary.paybackYears,
      lifetime25_profit_inr: liveSummary.lifetime25Profit,
      annual_saving_inr: liveSummary.annualSaving,
      ppt_input: mergedPpt as unknown as Record<string, unknown>,
      summary: liveSummary as unknown as Record<string, unknown>
    })
    .eq("id", proposalId);
  if (error) {
    console.warn("[proposal-pricing-sync] persist failed:", error.message);
    return false;
  }
  return true;
}

/**
 * Writes merged `ppt_input` + refreshed `summary` + scalar financial columns on `proposals`
 * after `proposal_pricing` changes — keeps public metadata, PPT, and web in sync.
 */
export async function persistProposalDeckAfterPricingChange(proposalId: string): Promise<boolean> {
  const proposal = await getProposalById(proposalId);
  const pricing = await getProposalPricingByProposalId(proposalId);
  if (!proposal) return false;

  let ppt = mergeProposalPricingIntoPptInput(proposal.ppt_input, pricing);
  const presetId = proposal.preset_id ?? "residential_smart";

  if (presetId === "commercial_executive" && pricing?.line_items?.length) {
    const lines = ensureCommercialPanelLines(
      normalizeLineItems(pricing.line_items as unknown[]),
      pricing.system_kw
    );
    const baseCfg =
      parseCommercialConfig(ppt.commercialConfig) ?? defaultCommercialConfig(pricing.system_kw);
    const syncedCfg = syncCommercialConfigFromPanelLines(baseCfg, lines, pricing.system_kw);
    const baseLayout = normalizeProposalTemplateV1(
      ppt.proposalLayout ?? { version: 1, blocks: [] }
    );
    ppt = {
      ...ppt,
      commercialConfig: syncedCfg,
      proposalLayout: applyCommercialFlagsToLayout(baseLayout, syncedCfg),
    };
  }

  return persistMergedProposalDeck(proposalId, ppt);
}

/** Persists modular `proposalLayout` into `ppt_input` without touching pricing rows. */
export async function persistProposalLayoutChange(proposalId: string, layout: ProposalTemplateV1): Promise<boolean> {
  const proposal = await getProposalById(proposalId);
  if (!proposal) return false;
  const pricing = await getProposalPricingByProposalId(proposalId);
  const normalized = normalizeProposalTemplateV1(layout);
  const mergedPpt = mergeProposalPricingIntoPptInput(
    { ...proposal.ppt_input, proposalLayout: normalized },
    pricing
  );
  return persistMergedProposalDeck(proposalId, mergedPpt);
}

/** Persists `commercialConfig` (+ optional layout sync) into `ppt_input`. */
export async function persistCommercialConfigChange(
  proposalId: string,
  commercialConfig: CommercialProposalConfig,
  proposalLayout?: ProposalTemplateV1
): Promise<boolean> {
  const proposal = await getProposalById(proposalId);
  if (!proposal) return false;
  const pricing = await getProposalPricingByProposalId(proposalId);
  const baseLayout =
    proposalLayout ??
    proposal.ppt_input.proposalLayout ??
    normalizeProposalTemplateV1({ version: 1, blocks: [] });
  const syncedLayout = applyCommercialFlagsToLayout(baseLayout, commercialConfig);
  const mergedPpt = mergeProposalPricingIntoPptInput(
    {
      ...proposal.ppt_input,
      commercialConfig,
      proposalLayout: syncedLayout,
    },
    pricing
  );
  return persistMergedProposalDeck(proposalId, mergedPpt);
}
