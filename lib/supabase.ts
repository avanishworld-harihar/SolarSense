import { createClient } from "@supabase/supabase-js";
import { normalizeLeadStatus } from "@/lib/lead-status";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function getStates() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("states").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getProjects() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(10);
  if (error) throw error;
  return data ?? [];
}

export type LeadSource =
  | "manual"
  | "website"
  | "whatsapp"
  | "meta_fb"
  | "meta_ig"
  | "api";

export interface CustomerInput {
  name: string;
  city: string;
  discom: string;
  monthly_bill: number;
  status?: string;
  phone?: string;
  /** Optional DISCOM consumer / CA number from bill. */
  consumer_id?: string | null;
  /** Site survey gate for web proposal (`not_started` | `scheduled` | `complete`). */
  survey_status?: string | null;
  /** CRM v2 attribution. Defaults to `'manual'` for the in-app add modal. */
  source?: LeadSource;
  /** Raw provider payload (form_id, ad_id, wa_message_id, etc.). */
  source_meta?: Record<string, unknown> | null;
  /** Indian state / UT (free text from `INDIAN_STATES_AND_UTS`). */
  state?: string | null;
  email?: string | null;
}

async function countFirstAvailable(candidates: string[]) {
  const client = createSupabaseAdmin() ?? supabase;
  if (!client) return { table: null as string | null, count: 0 };
  for (const table of candidates) {
    const { count, error } = await client.from(table).select("*", { count: "exact", head: true });
    if (!error) return { table, count: count ?? 0 };
  }
  return { table: null as string | null, count: 0 };
}

export async function resolveLeadsTable() {
  const resolved = await countFirstAvailable(["leads"]);
  return resolved.table;
}

export type PipelineProjectRow = {
  id: string;
  lead_id: string | null;
  official_name: string | null;
  lead_name: string | null;
  /** Linked lead CRM `status` (raw from DB); used for server-side filters. */
  lead_status?: string | null;
  capacity_kw: string | null;
  detail: string | null;
  status: string;
  install_progress: number;
  next_action: string | null;
  updated_at: string | null;
  /** CRM v2 — operator can declutter dashboard without dropping the row from /projects. */
  dashboard_visible: boolean;
  /** CRM v2 — soft-archive timestamp (end-of-life). */
  archived_at: string | null;
};

export type ListPipelineProjectsOptions = {
  /**
   * When true, only projects whose linked lead is CRM-won appear (Projects tab
   * spec). Customers / dashboard still use the full list when omitted.
   */
  wonLeadsOnly?: boolean;
};

/**
 * Display name shown on project cards / dashboard.
 *
 * Spec rule (Sol.52):
 *   - If only one of {official bill name, lead contact name} is present, show it.
 *   - If both are present and the FIRST tokens match (case-insensitive), drop
 *     the bracket — same person, no need to repeat.
 *     e.g. official="Ravi Sharma", lead="Ravi" → "Ravi Sharma"
 *   - Otherwise show "Official (Lead)" so installer instantly sees who to call
 *     vs. whose name is on the meter.
 *     e.g. official="Sunita Devi", lead="Rahul" → "Sunita Devi (Rahul)"
 */
export function formatPipelineDisplayName(official: string | null, leadName: string | null): string {
  const o = (official ?? "").trim();
  const l = (leadName ?? "").trim();
  if (!o && !l) return "—";
  if (!o) return l;
  if (!l) return o;
  const firstO = o.split(/\s+/)[0]?.toLowerCase() ?? "";
  const firstL = l.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (firstO && firstL && firstO === firstL) return o;
  return `${o} (${l})`;
}

/** Normalize project row → CRM lead UUID (PostgREST uses snake_case `lead_id`). */
function projectRowLeadId(r: Record<string, unknown>): string | null {
  const v = r.lead_id ?? r.leadId;
  if (v == null || v === "") return null;
  return String(v);
}

export async function listPipelineProjects(options?: ListPipelineProjectsOptions): Promise<PipelineProjectRow[]> {
  if (!supabase) return [];
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return [];

  const rows = (projects ?? []) as Record<string, unknown>[];
  const leadIds = [...new Set(rows.map((r) => projectRowLeadId(r)).filter(Boolean))] as string[];
  const leadMap = new Map<string, string>();
  const leadStatusMap = new Map<string, string>();

  if (leadIds.length) {
    const leadsTable = await resolveLeadsTable();
    if (leadsTable) {
      const { data: leads } = await supabase.from(leadsTable).select("id,name,status").in("id", leadIds);
      for (const L of leads ?? []) {
        const row = L as { id: unknown; name: unknown; status?: unknown };
        const id = String(row.id);
        leadMap.set(id, String(row.name ?? ""));
        if (row.status != null) leadStatusMap.set(id, String(row.status));
      }
    }
  }

  const mapped = rows.map((r) => {
    const leadId = projectRowLeadId(r);
    const leadStatus = leadId != null ? leadStatusMap.get(leadId) ?? null : null;
    return {
      id: String(r.id),
      lead_id: leadId,
      official_name: r.official_name != null ? String(r.official_name) : null,
      lead_name: leadId != null ? leadMap.get(leadId) ?? null : null,
      lead_status: leadStatus,
      capacity_kw: r.capacity_kw != null ? String(r.capacity_kw) : null,
      detail: r.detail != null ? String(r.detail) : null,
      status: String(r.status ?? "pending"),
      install_progress: Number(r.install_progress) || 0,
      next_action: r.next_action != null ? String(r.next_action) : null,
      updated_at: r.updated_at != null ? String(r.updated_at) : null,
      dashboard_visible: r.dashboard_visible === false ? false : true,
      archived_at: r.archived_at != null ? String(r.archived_at) : null
    };
  });

  if (options?.wonLeadsOnly) {
    return mapped.filter((row) => normalizeLeadStatus(row.lead_status) === "won");
  }
  return mapped;
}

/**
 * Patch helper for `PATCH /api/pipeline/[id]`. Accepts only the fields that
 * the operator can flip from the project card sheet — guarded server-side.
 * Returns the updated row, or null if the underlying client / table is
 * unavailable.
 */
export async function patchPipelineProject(
  id: string,
  patch: {
    dashboard_visible?: boolean;
    archived_at?: string | null;
    status?: string;
    next_action?: string | null;
    install_progress?: number;
    capacity_kw?: string;
    official_name?: string;
    detail?: string;
  }
): Promise<Record<string, unknown> | null> {
  if (!supabase) return null;
  const updateRow: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.dashboard_visible !== undefined) updateRow.dashboard_visible = patch.dashboard_visible;
  if (patch.archived_at !== undefined) updateRow.archived_at = patch.archived_at;
  if (patch.status !== undefined) updateRow.status = patch.status;
  if (patch.next_action !== undefined) updateRow.next_action = patch.next_action?.trim() || null;
  if (patch.install_progress !== undefined) {
    updateRow.install_progress = Math.min(100, Math.max(0, Math.round(patch.install_progress)));
  }
  if (patch.capacity_kw !== undefined) updateRow.capacity_kw = patch.capacity_kw?.trim() || null;
  if (patch.official_name !== undefined) updateRow.official_name = patch.official_name?.trim() || null;
  if (patch.detail !== undefined) updateRow.detail = patch.detail?.trim() || null;

  const { data, error } = await supabase
    .from("projects")
    .update(updateRow)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Record<string, unknown>;
}

/** Hard-delete a pipeline row (CRM board). Caller should revalidate SWR + dashboard stats. */
export async function deletePipelineProject(
  id: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!supabase) return { ok: false, reason: "db_unavailable" };
  const { data, error } = await supabase.from("projects").delete().eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, reason: error.message };
  if (!data) return { ok: false, reason: "not_found" };
  return { ok: true };
}

export async function upsertPipelineProject(payload: {
  lead_id: string;
  official_name?: string;
  capacity_kw?: string;
  detail?: string;
  status?: string;
  install_progress?: number;
  next_action?: string | null;
}): Promise<Record<string, unknown> | null> {
  if (!supabase) return null;
  const now = new Date().toISOString();
  const baseRow = {
    lead_id: payload.lead_id,
    official_name: payload.official_name?.trim() || null,
    capacity_kw: payload.capacity_kw ?? null,
    detail: payload.detail ?? null,
    status: payload.status ?? "pending",
    install_progress: Math.min(100, Math.max(0, Math.round(payload.install_progress ?? 0))),
    updated_at: now,
    ...(payload.next_action !== undefined
      ? { next_action: payload.next_action?.trim() || null }
      : {})
  };
  const { data, error } = await supabase
    .from("projects")
    .upsert(baseRow, { onConflict: "lead_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function listCustomers() {
  const client = createSupabaseAdmin() ?? supabase;
  if (!client) return [];
  const leadsTable = await resolveLeadsTable();
  if (!leadsTable) return [];
  const { data, error } = await client
    .from(leadsTable)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

/** Latest proposal id per lead (for CRM → commercial hand-off). */
export async function mapLeadIdsToLatestProposalIds(leadIds: string[]): Promise<Record<string, string>> {
  const uniq = [...new Set(leadIds.map((id) => id.trim()).filter(Boolean))];
  if (uniq.length === 0) return {};
  const client = createSupabaseAdmin() ?? supabase;
  if (!client) return {};
  const { data, error } = await client.from("proposals").select("id, lead_id, generated_at").in("lead_id", uniq);
  if (error || !Array.isArray(data)) return {};
  const rows = data as { id: string; lead_id: string | null; generated_at?: string | null }[];
  rows.sort((a, b) => String(b.generated_at ?? "").localeCompare(String(a.generated_at ?? "")));
  const out: Record<string, string> = {};
  for (const r of rows) {
    const lid = r.lead_id != null ? String(r.lead_id) : "";
    if (lid && !out[lid]) out[lid] = String(r.id);
  }
  return out;
}

/**
 * Move a lead to a new pipeline status and stamp `last_touched_at = now()`.
 * Used by the proposal POST (auto bump → 'proposal-sent') and by the lead
 * status pill dropdown. Best-effort: returns null if Supabase/leads table is
 * unavailable so callers in API routes don't crash the request.
 */
export async function bumpLeadStatus(
  leadId: string,
  status: string
): Promise<Record<string, unknown> | null> {
  const client = createSupabaseAdmin() ?? supabase;
  if (!client) return null;
  const leadsTable = await resolveLeadsTable();
  if (!leadsTable) return null;
  const { data, error } = await client
    .from(leadsTable)
    .update({ status, last_touched_at: new Date().toISOString() })
    .eq("id", leadId)
    .select("*")
    .single();
  if (error) {
    /* `last_touched_at` is added by 012_crm_v2.sql; if the migration hasn't
     * run yet, retry without that column so dev environments still work. */
    const retry = await client
      .from(leadsTable)
      .update({ status })
      .eq("id", leadId)
      .select("*")
      .single();
    if (retry.error) return null;
    return retry.data as Record<string, unknown>;
  }
  return data as Record<string, unknown>;
}

/** Bump only `last_touched_at` (call / WhatsApp / status-change without state move). */
export async function touchLead(leadId: string): Promise<void> {
  if (!supabase) return;
  const leadsTable = await resolveLeadsTable();
  if (!leadsTable) return;
  await supabase
    .from(leadsTable)
    .update({ last_touched_at: new Date().toISOString() })
    .eq("id", leadId);
}

/** Latest `survey_status` on the lead row (null if missing / offline / no column). */
export async function getLeadSurveyStatus(leadId: string | null | undefined): Promise<string | null> {
  const client = createSupabaseAdmin() ?? supabase;
  if (!client) return null;
  const id = leadId?.trim();
  if (!id) return null;
  const leadsTable = await resolveLeadsTable();
  if (!leadsTable) return null;
  try {
    const { data, error } = await client.from(leadsTable).select("survey_status").eq("id", id).maybeSingle();
    if (error) return null;
    const raw = (data as { survey_status?: unknown } | null)?.survey_status;
    if (raw == null) return null;
    const s = String(raw).trim();
    return s.length > 0 ? s : null;
  } catch {
    return null;
  }
}

/**
 * Look up an existing lead by phone (case-insensitive). Backed by the unique
 * partial index on `lower(phone)` from `012_crm_v2.sql`, so this is O(log n).
 * Used by both `/api/customers` POST and `/api/leads/inbound` to dedupe.
 */
export async function findLeadByPhone(phone: string): Promise<Record<string, unknown> | null> {
  if (!supabase) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const leadsTable = await resolveLeadsTable();
  if (!leadsTable) return null;
  const { data } = await supabase
    .from(leadsTable)
    .select("*")
    .ilike("phone", trimmed)
    .limit(1);
  if (Array.isArray(data) && data.length > 0) {
    return data[0] as Record<string, unknown>;
  }
  return null;
}

/**
 * Bump `last_touched_at` and fill in any missing CRM fields when a duplicate
 * inbound lead arrives. Returns the merged row.
 */
export async function refreshLeadFromInbound(
  id: string,
  patch: Partial<CustomerInput>
): Promise<Record<string, unknown> | null> {
  if (!supabase) return null;
  const leadsTable = await resolveLeadsTable();
  if (!leadsTable) return null;
  const updateRow: Record<string, unknown> = {
    last_touched_at: new Date().toISOString()
  };
  if (patch.city) updateRow.city = patch.city;
  if (patch.state) updateRow.state = patch.state;
  if (patch.discom) updateRow.discom = patch.discom;
  if (patch.email) updateRow.email = patch.email;
  if (patch.monthly_bill && patch.monthly_bill > 0) updateRow.monthly_bill = patch.monthly_bill;
  if (patch.phone && String(patch.phone).trim()) updateRow.phone = String(patch.phone).trim();
  if (patch.source && patch.source !== "manual") updateRow.source = patch.source;
  if (patch.source_meta) updateRow.source_meta = patch.source_meta;
  if (patch.consumer_id !== undefined) {
    const c = patch.consumer_id != null ? String(patch.consumer_id).trim() : "";
    updateRow.consumer_id = c.length > 0 ? c : null;
  }
  if (patch.survey_status !== undefined) {
    const s = patch.survey_status != null ? String(patch.survey_status).trim().toLowerCase() : "";
    updateRow.survey_status = s.length > 0 ? s : null;
  }

  const { data, error } = await supabase
    .from(leadsTable)
    .update(updateRow)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    /* Tolerate envs where the v2 columns don't exist yet. */
    const fallback: Record<string, unknown> = {};
    if (patch.city) fallback.city = patch.city;
    if (patch.discom) fallback.discom = patch.discom;
    if (patch.monthly_bill && patch.monthly_bill > 0) fallback.monthly_bill = patch.monthly_bill;
    if (patch.phone && String(patch.phone).trim()) fallback.phone = String(patch.phone).trim();
    if (patch.consumer_id !== undefined) {
      const c = patch.consumer_id != null ? String(patch.consumer_id).trim() : "";
      fallback.consumer_id = c.length > 0 ? c : null;
    }
    if (patch.survey_status !== undefined) {
      const s = patch.survey_status != null ? String(patch.survey_status).trim().toLowerCase() : "";
      fallback.survey_status = s.length > 0 ? s : null;
    }
    if (Object.keys(fallback).length === 0) return null;
    const retry = await supabase
      .from(leadsTable)
      .update(fallback)
      .eq("id", id)
      .select("*")
      .single();
    if (retry.error) return null;
    return retry.data as Record<string, unknown>;
  }
  return data as Record<string, unknown>;
}

export async function createCustomer(payload: CustomerInput) {
  if (!supabase) throw new Error("Supabase not configured");
  const leadsTable = await resolveLeadsTable();
  if (!leadsTable) throw new Error("No leads table found. Expected 'leads' or 'customers'.");
  const basePayload: Record<string, unknown> = {
    name: payload.name,
    city: payload.city,
    discom: payload.discom,
    status: payload.status ?? "new",
    phone: payload.phone ?? null
  };
  /** CRM v2 attribution columns. Older deploys without 012 just drop them. */
  if (payload.state !== undefined) basePayload.state = payload.state ?? null;
  if (payload.email !== undefined) basePayload.email = payload.email ?? null;
  if (payload.source !== undefined) basePayload.source = payload.source;
  if (payload.source_meta !== undefined) basePayload.source_meta = payload.source_meta ?? null;
  if (payload.consumer_id !== undefined && payload.consumer_id != null) {
    const c = String(payload.consumer_id).trim();
    if (c.length > 0) basePayload.consumer_id = c;
  }
  if (payload.survey_status !== undefined && payload.survey_status != null) {
    const s = String(payload.survey_status).trim().toLowerCase();
    if (s.length > 0) basePayload.survey_status = s;
  }
  basePayload.last_touched_at = new Date().toISOString();

  /** Strip CRM v2 columns for retry against pre-012 schemas. */
  const fallbackBase: Record<string, unknown> = {
    name: payload.name,
    city: payload.city,
    discom: payload.discom,
    status: payload.status ?? "new",
    phone: payload.phone ?? null
  };

  const attempts: Record<string, unknown>[] = [
    { ...basePayload, monthly_bill: payload.monthly_bill },
    { ...basePayload, monthlyBill: payload.monthly_bill },
    { ...fallbackBase, monthly_bill: payload.monthly_bill },
    { ...fallbackBase, monthlyBill: payload.monthly_bill },
    fallbackBase
  ];

  const errors: string[] = [];
  for (const attempt of attempts) {
    const { data, error } = await supabase.from(leadsTable).insert(attempt).select("*").single();
    if (!error) return data;
    errors.push(error.message);
  }
  throw new Error(`Insert into ${leadsTable} failed: ${errors.join(" | ")}`);
}
