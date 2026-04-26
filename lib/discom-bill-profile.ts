import { createSupabaseAdmin } from "@/lib/supabase-admin";

const CANDIDATE_TABLES = ["discom_bill_profiles", "bill_format_profiles"] as const;

export type SyncedBillProfile = {
  state: string;
  discom: string;
  historyWindowMonths: number;
  requiredBills: number;
  confidence: number;
  source: string;
  updatedAt: string | null;
};

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function missingColumn(errMessage: string): string | null {
  const match = /Could not find the '([^']+)' column/i.exec(errMessage);
  return match?.[1] ?? null;
}

function mapRow(row: Record<string, unknown>): SyncedBillProfile {
  return {
    state: String(row.state ?? row.installer_state ?? ""),
    discom: String(row.discom ?? row.active_tariff ?? ""),
    historyWindowMonths: Math.max(1, Number(row.history_window_months ?? row.history_window ?? 6) || 6),
    requiredBills: Math.max(1, Number(row.required_bills ?? row.bills_required ?? 1) || 1),
    confidence: Math.max(0, Math.min(1, Number(row.confidence ?? row.profile_confidence ?? 0.7) || 0.7)),
    source: String(row.source ?? "self_learning"),
    updatedAt: row.updated_at != null ? String(row.updated_at) : row.created_at != null ? String(row.created_at) : null
  };
}

export async function readDiscomBillProfile(stateInput: string, discomInput: string): Promise<SyncedBillProfile | null> {
  const admin = createSupabaseAdmin();
  if (!admin) return null;
  const state = norm(stateInput);
  const discom = norm(discomInput);
  if (!state || !discom) return null;

  for (const table of CANDIDATE_TABLES) {
    const { data, error } = await admin
      .from(table)
      .select("*")
      .ilike("state", state)
      .ilike("discom", discom)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) continue;
    if (!data) continue;
    return mapRow(data as Record<string, unknown>);
  }
  return null;
}

async function upsertAdaptive(
  table: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const admin = createSupabaseAdmin();
  if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY missing." };
  const attempt = { ...payload };
  let guard = 0;
  while (guard < 20 && Object.keys(attempt).length > 0) {
    guard += 1;
    const { data, error } = await admin.from(table).upsert(attempt).select("*").maybeSingle();
    if (!error && data) return { ok: true, data: data as Record<string, unknown> };
    if (!error) return { ok: false, error: "Upsert failed." };
    const miss = missingColumn(error.message);
    if (miss && miss in attempt) {
      delete attempt[miss];
      continue;
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Upsert failed." };
}

export async function upsertDiscomBillProfile(input: {
  state: string;
  discom: string;
  historyWindowMonths: number;
  requiredBills: number;
  confidence?: number;
  source?: string;
}): Promise<{ ok: boolean; table?: string; row?: SyncedBillProfile; error?: string }> {
  const state = input.state.trim();
  const discom = input.discom.trim();
  if (!state || !discom) return { ok: false, error: "state/discom required." };
  const payload = {
    state,
    discom,
    history_window_months: Math.max(1, Math.round(input.historyWindowMonths)),
    required_bills: Math.max(1, Math.round(input.requiredBills)),
    confidence: input.confidence != null ? Math.max(0, Math.min(1, input.confidence)) : 0.7,
    source: input.source ?? "self_learning",
    updated_at: new Date().toISOString()
  };
  for (const table of CANDIDATE_TABLES) {
    const res = await upsertAdaptive(table, payload);
    if (res.ok && res.data) {
      return { ok: true, table, row: mapRow(res.data) };
    }
  }
  return { ok: false, error: `Upsert failed for ${CANDIDATE_TABLES.join(", ")}.` };
}
