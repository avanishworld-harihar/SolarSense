/**
 * Read/write `proposal_pricing` — normalized commercial row per proposal.
 */

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProposalPricingRow } from "@/lib/proposal-pricing-schema";
import { proposalPricingRowSchema } from "@/lib/proposal-pricing-schema";
import type { ProposalPricingInsert } from "@/lib/proposal-pricing-merge";

type Row = Record<string, unknown>;

function rwClient(): SupabaseClient | null {
  return createSupabaseAdmin() ?? supabase;
}

function missingColumn(message: string): string | null {
  const m = /Could not find the '([^']+)' column/i.exec(message);
  return m?.[1] ?? null;
}

async function insertAdaptive(client: SupabaseClient, payload: Row): Promise<boolean> {
  const attempt = { ...payload };
  let guard = 0;
  while (guard < 30 && Object.keys(attempt).length > 0) {
    guard += 1;
    const { error } = await client.from("proposal_pricing").insert(attempt);
    if (!error) return true;
    const miss = missingColumn(error.message);
    if (miss && miss in attempt) {
      delete attempt[miss];
      continue;
    }
    console.warn("[proposal-pricing-store] insert failed:", error.message);
    return false;
  }
  return false;
}

function parseRow(data: unknown): ProposalPricingRow | null {
  const parsed = proposalPricingRowSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function getProposalPricingByProposalId(proposalId: string): Promise<ProposalPricingRow | null> {
  const client = rwClient();
  if (!client) return null;
  const { data, error } = await client.from("proposal_pricing").select("*").eq("proposal_id", proposalId).maybeSingle();
  if (error && !/no rows/i.test(error.message)) {
    console.warn("[proposal-pricing-store] get:", error.message);
  }
  return data ? parseRow(data) : null;
}

export async function upsertProposalPricingInsert(insert: ProposalPricingInsert): Promise<ProposalPricingRow | null> {
  const client = rwClient();
  if (!client) return null;
  const row: Row = {
    proposal_id: insert.proposal_id,
    system_kw: insert.system_kw,
    price_per_watt_inr: insert.price_per_watt_inr,
    hardware_inr: insert.hardware_inr,
    installation_inr: insert.installation_inr,
    structure_inr: insert.structure_inr,
    subsidy_inr: insert.subsidy_inr,
    discount_inr: insert.discount_inr,
    final_amount_inr: insert.final_amount_inr,
    manual_final_override: insert.manual_final_override,
    line_items: insert.line_items,
    updated_at: new Date().toISOString()
  };
  const ok = await insertAdaptive(client, row);
  if (!ok) return null;
  return getProposalPricingByProposalId(insert.proposal_id);
}

/** Insert-on-create; ignores duplicate. */
export async function ensureProposalPricingRow(insert: ProposalPricingInsert): Promise<ProposalPricingRow | null> {
  const existing = await getProposalPricingByProposalId(insert.proposal_id);
  if (existing) return existing;
  return upsertProposalPricingInsert(insert);
}

export async function replaceProposalPricing(row: ProposalPricingRow): Promise<ProposalPricingRow | null> {
  const client = rwClient();
  if (!client) return null;
  const { data, error } = await client
    .from("proposal_pricing")
    .update({
      system_kw: row.system_kw,
      price_per_watt_inr: row.price_per_watt_inr,
      hardware_inr: row.hardware_inr,
      installation_inr: row.installation_inr,
      structure_inr: row.structure_inr,
      subsidy_inr: row.subsidy_inr,
      discount_inr: row.discount_inr,
      final_amount_inr: row.final_amount_inr,
      manual_final_override: row.manual_final_override,
      line_items: row.line_items,
      updated_at: new Date().toISOString()
    })
    .eq("id", row.id)
    .select("*")
    .maybeSingle();
  if (error) {
    console.warn("[proposal-pricing-store] replace:", error.message);
    return null;
  }
  return data ? parseRow(data) : null;
}
