/**
 * Sol.52 — proposals table read/write helpers.
 *
 * Backs the public `/proposal/[id]` web view and the downloadable .pptx,
 * so the customer's WhatsApp link and the PPT show identical numbers.
 */

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PremiumProposalPptInput, ProposalDeckSummary } from "@/lib/proposal-ppt";

type Row = Record<string, unknown>;

function rwClient(): SupabaseClient | null {
  return createSupabaseAdmin() ?? supabase;
}

function missingColumn(message: string): string | null {
  const m = /Could not find the '([^']+)' column/i.exec(message);
  return m?.[1] ?? null;
}

async function insertAdaptive<T = Row>(
  client: SupabaseClient,
  table: string,
  payload: Row,
  returning = "*"
): Promise<T | null> {
  const attempt = { ...payload };
  let guard = 0;
  while (guard < 40 && Object.keys(attempt).length > 0) {
    guard += 1;
    const { data, error } = await client.from(table).insert(attempt).select(returning).single();
    if (!error) return (data as T) ?? null;
    const miss = missingColumn(error.message);
    if (miss && miss in attempt) {
      delete attempt[miss];
      continue;
    }
    console.warn("[proposals-store] insert failed:", error.message);
    return null;
  }
  return null;
}

export type CreateProposalInput = {
  pptInput: PremiumProposalPptInput;
  summary: ProposalDeckSummary;
  clientRef?: string | null;
  leadId?: string | null;
  consumerId?: string | null;
  createdBy?: string | null;
  expiresAt?: Date | null;
};

export type StoredProposal = {
  id: string;
  share_token: string;
  customer_name: string;
  generated_at: string;
};

export async function createProposal(input: CreateProposalInput): Promise<StoredProposal | null> {
  const client = rwClient();
  if (!client) return null;

  const s = input.summary;
  const p = input.pptInput;

  const payload: Row = {
    client_ref: input.clientRef?.trim() || null,
    lead_id: input.leadId?.trim() || null,
    customer_id: input.consumerId?.trim() || null,

    customer_name: p.customerName,
    honored_name: s.honoredName,
    location: p.location,
    state: p.state ?? null,
    discom: p.discom ?? null,
    tariff_category: p.tariffCategory ?? null,
    connection_type: p.connectionType ?? null,
    connected_load_kw: p.connectedLoadKw ?? null,
    area_profile: p.areaProfile ?? null,

    system_kw: p.systemKw,
    panels: s.panels,
    panel_brand: s.panelBrand,

    yearly_bill_inr: s.yearlyBill,
    after_solar_inr: s.afterSolar,
    annual_saving_inr: s.annualSaving,
    gross_system_cost_inr: s.grossSystemCost,
    pm_subsidy_inr: s.pmSubsidy,
    net_cost_inr: s.netCost,
    payback_years: s.paybackYears,
    lifetime25_profit_inr: s.lifetime25Profit,
    total_reduction_pct: s.totalReduction,
    summer_pct: s.summerPct,
    fixed_annual_inr: s.fixedAnnual,

    installer_name: s.installer,
    installer_contact: s.contact,
    installer_tagline: s.tagline,

    ppt_input: p as unknown as Row,
    summary: s as unknown as Row,

    created_by: input.createdBy ?? null,
    expires_at: input.expiresAt?.toISOString() ?? null
  };

  return await insertAdaptive<StoredProposal>(client, "proposals", payload, "id, share_token, customer_name, generated_at");
}

export type ProposalRecord = StoredProposal & {
  ppt_input: PremiumProposalPptInput;
  summary: ProposalDeckSummary;
  generated_at: string;
  view_count: number;
  installer_name: string | null;
  installer_contact: string | null;
  installer_tagline: string | null;
  expires_at: string | null;
};

/**
 * UUID v4 sanity check — prevents wasted round-trips for obvious garbage.
 */
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Look up a proposal by its `id`. If the id doesn't match (e.g. the customer
 * was given a share-token URL), fall back to a share_token lookup so the
 * /proposal/[id] route works in either case.
 *
 * Both columns are unguessable v4 UUIDs and the row is read-only over RLS,
 * so making the URL "share-by-link" is safe by design.
 */
export async function getProposalById(idOrToken: string): Promise<ProposalRecord | null> {
  const client = rwClient();
  if (!client) return null;
  const candidate = idOrToken.trim();
  if (!UUID_RX.test(candidate)) {
    console.warn("[proposals-store] getProposalById: not a UUID:", candidate);
    return null;
  }
  // Try `id` first.
  const byId = await client.from("proposals").select("*").eq("id", candidate).maybeSingle();
  if (byId.data) return byId.data as unknown as ProposalRecord;

  // Fall back to share_token.
  const byToken = await client.from("proposals").select("*").eq("share_token", candidate).maybeSingle();
  if (byToken.data) return byToken.data as unknown as ProposalRecord;

  if (byId.error && !/no rows/i.test(byId.error.message)) {
    console.warn("[proposals-store] getProposalById id error:", byId.error.message);
  }
  if (byToken.error && !/no rows/i.test(byToken.error.message)) {
    console.warn("[proposals-store] getProposalById token error:", byToken.error.message);
  }
  return null;
}

export async function getProposalByShareToken(token: string): Promise<ProposalRecord | null> {
  return getProposalById(token);
}

export async function trackProposalView(id: string): Promise<void> {
  const client = rwClient();
  if (!client) return;
  try {
    await client.rpc("increment_proposal_view", { p_id: id }).single();
  } catch {
    // Fallback: best-effort count update without RPC.
    try {
      const { data } = await client.from("proposals").select("view_count").eq("id", id).single();
      const next = ((data as { view_count?: number } | null)?.view_count ?? 0) + 1;
      await client.from("proposals").update({ view_count: next, last_viewed_at: new Date().toISOString() }).eq("id", id);
    } catch {
      /* ignore */
    }
  }
}
