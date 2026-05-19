/**
 * SOL.52 — Quotations store (Wave 2 P5).
 *
 * Lightweight CRUD for the `quotations` table.
 * Quotations are standalone commercial quotes — BOM + price + terms,
 * optionally linked to a proposal via proposal_id.
 *
 * Public share: /quote/[share_token] (anon SELECT via RLS)
 * WhatsApp deeplink: generated from share_token in lib/quotation-share.ts
 *
 * Law 2: this module never updates or deletes via destructive SQL.
 * All status transitions are UPDATE only.
 * Law 8: no marketplace/seller/commission fields are present.
 */

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

function rwClient(): SupabaseClient | null {
  return createSupabaseAdmin() ?? supabase;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export const QUOTATION_STATUS_IDS = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUS_IDS)[number];

export type QuotationRow = {
  id: string;
  org_id: string | null;
  proposal_id: string | null;
  share_token: string;
  customer_name: string;
  customer_phone: string | null;
  site_address: string | null;
  pricing_snapshot_id: string | null;
  system_kw: number | null;
  hardware_inr: number | null;
  installation_inr: number | null;
  subsidy_inr: number | null;
  discount_inr: number | null;
  final_amount_inr: number | null;
  payment_terms: string | null;
  validity_days: number;
  status: QuotationStatus;
  created_at: string;
  sent_at: string | null;
  expires_at: string | null;
  updated_at: string;
};

export type CreateQuotationInput = {
  proposal_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  site_address?: string | null;
  pricing_snapshot_id?: string | null;
  system_kw?: number | null;
  hardware_inr?: number | null;
  installation_inr?: number | null;
  subsidy_inr?: number | null;
  discount_inr?: number | null;
  final_amount_inr?: number | null;
  payment_terms?: string | null;
  validity_days?: number;
};

export type QuotationPatch = Partial<
  Pick<
    QuotationRow,
    | "customer_name"
    | "customer_phone"
    | "site_address"
    | "system_kw"
    | "hardware_inr"
    | "installation_inr"
    | "subsidy_inr"
    | "discount_inr"
    | "final_amount_inr"
    | "payment_terms"
    | "validity_days"
    | "status"
  >
>;

// ─── Internal parse ──────────────────────────────────────────────────────────

function parseRow(raw: Row): QuotationRow {
  const status = QUOTATION_STATUS_IDS.includes(raw.status as QuotationStatus)
    ? (raw.status as QuotationStatus)
    : "draft";
  return {
    id: String(raw.id),
    org_id: raw.org_id != null ? String(raw.org_id) : null,
    proposal_id: raw.proposal_id != null ? String(raw.proposal_id) : null,
    share_token: String(raw.share_token),
    customer_name: String(raw.customer_name ?? ""),
    customer_phone: raw.customer_phone != null ? String(raw.customer_phone) : null,
    site_address: raw.site_address != null ? String(raw.site_address) : null,
    pricing_snapshot_id: raw.pricing_snapshot_id != null ? String(raw.pricing_snapshot_id) : null,
    system_kw: raw.system_kw != null ? Number(raw.system_kw) : null,
    hardware_inr: raw.hardware_inr != null ? Number(raw.hardware_inr) : null,
    installation_inr: raw.installation_inr != null ? Number(raw.installation_inr) : null,
    subsidy_inr: raw.subsidy_inr != null ? Number(raw.subsidy_inr) : null,
    discount_inr: raw.discount_inr != null ? Number(raw.discount_inr) : null,
    final_amount_inr: raw.final_amount_inr != null ? Number(raw.final_amount_inr) : null,
    payment_terms: raw.payment_terms != null ? String(raw.payment_terms) : null,
    validity_days: Number(raw.validity_days ?? 30),
    status,
    created_at: String(raw.created_at ?? ""),
    sent_at: raw.sent_at != null ? String(raw.sent_at) : null,
    expires_at: raw.expires_at != null ? String(raw.expires_at) : null,
    updated_at: String(raw.updated_at ?? ""),
  };
}

function safeParseRow(raw: Row): QuotationRow | null {
  try {
    return parseRow(raw);
  } catch {
    return null;
  }
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getQuotationById(id: string): Promise<QuotationRow | null> {
  const client = rwClient();
  if (!client) return null;
  const { data, error } = await client
    .from("quotations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (!/does not exist|relation/i.test(error.message)) {
      console.warn("[quotations-store] getById:", error.message);
    }
    return null;
  }
  return data ? safeParseRow(data as Row) : null;
}

/** Public read — used by /quote/[token] page (anon). */
export async function getQuotationByToken(shareToken: string): Promise<QuotationRow | null> {
  const client = rwClient();
  if (!client) return null;
  const { data, error } = await client
    .from("quotations")
    .select("*")
    .eq("share_token", shareToken)
    .maybeSingle();
  if (error) {
    if (!/does not exist|relation/i.test(error.message)) {
      console.warn("[quotations-store] getByToken:", error.message);
    }
    return null;
  }
  return data ? safeParseRow(data as Row) : null;
}

/** List all quotations, newest first. Optionally filter by proposal_id. */
export async function listQuotations(proposalId?: string): Promise<QuotationRow[]> {
  const client = rwClient();
  if (!client) return [];
  let q = client.from("quotations").select("*").order("created_at", { ascending: false });
  if (proposalId) q = q.eq("proposal_id", proposalId);
  const { data, error } = await q;
  if (error) {
    if (!/does not exist|relation/i.test(error.message)) {
      console.warn("[quotations-store] list:", error.message);
    }
    return [];
  }
  return (data as Row[]).flatMap((r) => {
    const q = safeParseRow(r);
    return q ? [q] : [];
  });
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createQuotation(
  input: CreateQuotationInput
): Promise<QuotationRow | null> {
  const client = rwClient();
  if (!client) return null;

  const payload: Row = {
    customer_name: input.customer_name,
    customer_phone: input.customer_phone ?? null,
    site_address: input.site_address ?? null,
    proposal_id: input.proposal_id ?? null,
    pricing_snapshot_id: input.pricing_snapshot_id ?? null,
    system_kw: input.system_kw ?? null,
    hardware_inr: input.hardware_inr ?? null,
    installation_inr: input.installation_inr ?? null,
    subsidy_inr: input.subsidy_inr ?? null,
    discount_inr: input.discount_inr ?? null,
    final_amount_inr: input.final_amount_inr ?? null,
    payment_terms: input.payment_terms ?? null,
    validity_days: input.validity_days ?? 30,
    status: "draft",
  };

  const { data, error } = await client
    .from("quotations")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (!/does not exist|relation/i.test(error.message)) {
      console.warn("[quotations-store] create:", error.message);
    }
    return null;
  }
  return data ? safeParseRow(data as Row) : null;
}

export async function updateQuotation(
  id: string,
  patch: QuotationPatch
): Promise<QuotationRow | null> {
  const client = rwClient();
  if (!client) return null;

  const { data, error } = await client
    .from("quotations")
    .update(patch as Row)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.warn("[quotations-store] update:", error.message);
    return null;
  }
  return data ? safeParseRow(data as Row) : null;
}

/** Mark as sent and record sent_at timestamp. */
export async function markQuotationSent(id: string): Promise<boolean> {
  const client = rwClient();
  if (!client) return false;
  const { error } = await client
    .from("quotations")
    .update({ status: "sent", sent_at: new Date().toISOString() } as Row)
    .eq("id", id);
  if (error) {
    console.warn("[quotations-store] markSent:", error.message);
    return false;
  }
  return true;
}
