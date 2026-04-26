import { createClient } from "@supabase/supabase-js";

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

export interface CustomerInput {
  name: string;
  city: string;
  discom: string;
  monthly_bill: number;
  status?: string;
  phone?: string;
}

async function countFirstAvailable(candidates: string[]) {
  if (!supabase) return { table: null as string | null, count: 0 };
  for (const table of candidates) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
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
  capacity_kw: string | null;
  detail: string | null;
  status: string;
  install_progress: number;
  next_action: string | null;
  updated_at: string | null;
};

/** Display: "Official on bill (Lead contact)" for installer follow-ups */
export function formatPipelineDisplayName(official: string | null, leadName: string | null): string {
  const o = (official && official.trim()) || "—";
  const l = leadName?.trim();
  if (l) return `${o} (${l})`;
  return o;
}

export async function listPipelineProjects(): Promise<PipelineProjectRow[]> {
  if (!supabase) return [];
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return [];

  const rows = (projects ?? []) as Record<string, unknown>[];
  const leadIds = [...new Set(rows.map((r) => r.lead_id).filter(Boolean))] as string[];
  const leadMap = new Map<string, string>();

  if (leadIds.length) {
    const leadsTable = await resolveLeadsTable();
    if (leadsTable) {
      const { data: leads } = await supabase.from(leadsTable).select("id,name").in("id", leadIds);
      for (const L of leads ?? []) {
        const row = L as { id: unknown; name: unknown };
        leadMap.set(String(row.id), String(row.name ?? ""));
      }
    }
  }

  return rows.map((r) => ({
    id: String(r.id),
    lead_id: r.lead_id != null ? String(r.lead_id) : null,
    official_name: r.official_name != null ? String(r.official_name) : null,
    lead_name: r.lead_id != null ? leadMap.get(String(r.lead_id)) ?? null : null,
    capacity_kw: r.capacity_kw != null ? String(r.capacity_kw) : null,
    detail: r.detail != null ? String(r.detail) : null,
    status: String(r.status ?? "pending"),
    install_progress: Number(r.install_progress) || 0,
    next_action: r.next_action != null ? String(r.next_action) : null,
    updated_at: r.updated_at != null ? String(r.updated_at) : null
  }));
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
  if (!supabase) return [];
  const leadsTable = await resolveLeadsTable();
  if (!leadsTable) return [];
  const { data, error } = await supabase
    .from(leadsTable)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function createCustomer(payload: CustomerInput) {
  if (!supabase) throw new Error("Supabase not configured");
  const leadsTable = await resolveLeadsTable();
  if (!leadsTable) throw new Error("No leads table found. Expected 'leads' or 'customers'.");
  const basePayload = {
    name: payload.name,
    city: payload.city,
    discom: payload.discom,
    status: payload.status ?? "new",
    phone: payload.phone ?? null
  };

  const attempts = [
    { ...basePayload, monthly_bill: payload.monthly_bill },
    { ...basePayload, monthlyBill: payload.monthly_bill },
    basePayload
  ];

  const errors: string[] = [];
  for (const attempt of attempts) {
    const { data, error } = await supabase.from(leadsTable).insert(attempt).select("*").single();
    if (!error) return data;
    errors.push(error.message);
  }
  throw new Error(`Insert into ${leadsTable} failed: ${errors.join(" | ")}`);
}
