/**
 * Fetch helpers for the `mp_bill_audits` Supabase table.
 *
 * Used by:
 *   • `/api/proposal-ppt` to populate month-wise audited values before PPT
 *     generation, so the slide deck reflects truth that was already validated.
 *   • Downstream dashboards that need historical audit lookups.
 *
 * The table is created in `supabase/migrations/008_mp_bill_audits.sql`. We
 * defensively read columns (some installations may have a partial schema if
 * the migration is not yet applied).
 */

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import type { MonthlyUnits } from "@/lib/types";
import type { MpMonthlyAuditOverride } from "@/lib/mp-ppt-bill-rows";

type Row = Record<string, unknown>;

const MONTH_KEYS: (keyof MonthlyUnits)[] = [
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"
];

const MONTH_FROM_LABEL: Record<string, keyof MonthlyUnits> = {
  jan: "jan", january: "jan",
  feb: "feb", february: "feb",
  mar: "mar", march: "mar",
  apr: "apr", april: "apr",
  may: "may",
  jun: "jun", june: "jun",
  jul: "jul", july: "jul",
  aug: "aug", august: "aug",
  sep: "sep", sept: "sep", september: "sep",
  oct: "oct", october: "oct",
  nov: "nov", november: "nov",
  dec: "dec", december: "dec"
};

function readClient() {
  return createSupabaseAdmin() ?? supabase;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/,/g, "").replace(/[^\d.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function pickMonthKey(row: Row): keyof MonthlyUnits | null {
  const raw =
    typeof row.billing_month === "string" ? row.billing_month :
    typeof row.bill_month === "string" ? row.bill_month :
    typeof row.billing_period_to === "string" ? row.billing_period_to :
    "";
  const m = String(raw).toLowerCase().match(/[a-z]+/);
  if (!m) {
    // Try ISO date fallback (YYYY-MM-DD).
    const iso = String(raw).match(/^(\d{4})-(\d{2})/);
    if (iso) {
      const monthIdx = Number(iso[2]) - 1;
      if (monthIdx >= 0 && monthIdx < 12) return MONTH_KEYS[monthIdx];
    }
    return null;
  }
  return MONTH_FROM_LABEL[m[0]] ?? null;
}

export type FetchAuditOverridesInput = {
  clientRef?: string | null;
  leadId?: string | null;
  consumerId?: string | null;
  /** Limit lookup window — defaults to 18 months (covers MP 6-month windows × 2 + buffer). */
  withinDays?: number;
};

export type AuditOverrideMap = Partial<Record<keyof MonthlyUnits, MpMonthlyAuditOverride>>;

export async function fetchMpAuditOverridesByRef(input: FetchAuditOverridesInput): Promise<{
  overrides: AuditOverrideMap;
  matchedRows: number;
  source: "supabase" | "none";
}> {
  const client = readClient();
  if (!client) return { overrides: {}, matchedRows: 0, source: "none" };

  const ref = input.clientRef?.trim();
  const lead = input.leadId?.trim();
  const consumer = input.consumerId?.trim();
  if (!ref && !lead && !consumer) return { overrides: {}, matchedRows: 0, source: "none" };

  let query = client.from("mp_bill_audits").select("*").order("generated_at", { ascending: false }).limit(60);
  // Build OR filter dynamically.
  const orParts: string[] = [];
  if (ref) orParts.push(`client_ref.eq.${ref}`);
  if (lead) orParts.push(`lead_id.eq.${lead}`);
  if (consumer) orParts.push(`consumer_id.eq.${consumer}`);
  if (orParts.length > 0) {
    query = query.or(orParts.join(","));
  }

  if (input.withinDays && input.withinDays > 0) {
    const since = new Date(Date.now() - input.withinDays * 24 * 3600 * 1000).toISOString();
    query = query.gte("generated_at", since);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[mp-bill-audit-fetch] query failed:", error.message);
    return { overrides: {}, matchedRows: 0, source: "none" };
  }
  const rows = (data as Row[] | null) ?? [];
  if (rows.length === 0) return { overrides: {}, matchedRows: 0, source: "supabase" };

  const overrides: AuditOverrideMap = {};
  // Latest first — first hit per month wins.
  for (const row of rows) {
    const key = pickMonthKey(row);
    if (!key || overrides[key]) continue;
    const net = num(row.net_payable_inr) ?? num(row.validation_calculated_inr);
    if (net == null || net <= 0) continue;
    overrides[key] = {
      netPayableInr: net,
      energyInr: num(row.energy_charge_inr) ?? undefined,
      fixedInr: num(row.fixed_charge_inr) ?? undefined,
      fppasInr: num(row.fppas_inr) ?? undefined,
      electricityDutyInr: num(row.electricity_duty_inr) ?? undefined,
      units: num(row.units_chosen) ?? undefined
    };
  }

  return { overrides, matchedRows: rows.length, source: "supabase" };
}
