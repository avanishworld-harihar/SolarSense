import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type RateChangeReportInput = {
  installerName: string;
  installerState: string;
  activeTariff: string;
  source?: "more_manual" | "ai_scan" | "discom_discovery";
  status?: "pending_admin_approval" | "verified";
  detectedRates?: number[];
  databaseRates?: number[];
  note?: string | null;
  dedupeKey?: string | null;
  dedupeWindowHours?: number;
};

type SaveResult =
  | { ok: true; id: string; table: string; duplicate?: boolean }
  | { ok: false; error: string; code: "config" | "db" };

export type TariffReportStatus = "pending_admin_approval" | "verified" | "ignored" | "false_positive";
export type TariffReviewAction = "approve" | "ignore" | "false_positive";

export type TariffReportRow = {
  id: string;
  table: string;
  installerName: string;
  installerState: string;
  activeTariff: string;
  source: string;
  status: TariffReportStatus;
  detectedRates: number[];
  databaseRates: number[];
  note: string | null;
  reportedAt: string | null;
  updatedAt: string | null;
  reviewedBy: string | null;
};

const CANDIDATE_TABLES = ["rate_change_reports", "tariff_change_reports"] as const;

function missingColumn(errMessage: string): string | null {
  const match = /Could not find the '([^']+)' column/i.exec(errMessage);
  return match?.[1] ?? null;
}

async function insertAdaptive(
  admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  table: string,
  payload: Record<string, unknown>
) {
  const attempt = { ...payload };
  let guard = 0;
  while (guard < 20 && Object.keys(attempt).length > 0) {
    guard += 1;
    const { data, error } = await admin.from(table).insert(attempt).select("id,status").single();
    if (!error && data?.id) return { ok: true as const, data };
    if (!error) return { ok: false as const, message: "Insert failed" };
    const miss = missingColumn(error.message);
    if (miss && miss in attempt) {
      delete attempt[miss];
      continue;
    }
    return { ok: false as const, message: error.message };
  }
  return { ok: false as const, message: "Insert failed" };
}

function containsMissingColumn(errorMessage: string): boolean {
  return /Could not find the '[^']+' column/i.test(errorMessage);
}

function toNumArray(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.round(n * 1000) / 1000);
}

function deriveStatus(row: Record<string, unknown>): TariffReportStatus {
  const statusRaw = String(row.status ?? "").trim().toLowerCase();
  if (statusRaw === "verified") return "verified";
  if (statusRaw === "ignored") return "ignored";
  if (statusRaw === "false_positive") return "false_positive";
  if (row.pending_admin_approval === true) return "pending_admin_approval";
  const note = String(row.report_note ?? "").toLowerCase();
  if (note.includes("[admin-action:false_positive]")) return "false_positive";
  if (note.includes("[admin-action:ignore]")) return "ignored";
  return "pending_admin_approval";
}

function mapRow(table: string, row: Record<string, unknown>): TariffReportRow {
  const status = deriveStatus(row);
  return {
    id: String(row.id ?? ""),
    table,
    installerName: String(row.installer_name ?? "Unknown Installer"),
    installerState: String(row.installer_state ?? "Unknown State"),
    activeTariff: String(row.active_tariff ?? "Unknown Tariff"),
    source: String(row.source ?? "unknown"),
    status,
    detectedRates: toNumArray(row.detected_rates),
    databaseRates: toNumArray(row.database_rates),
    note: row.report_note != null ? String(row.report_note) : null,
    reportedAt:
      row.reported_at != null
        ? String(row.reported_at)
        : row.created_at != null
          ? String(row.created_at)
          : null,
    updatedAt:
      row.updated_at != null
        ? String(row.updated_at)
        : row.reported_at != null
          ? String(row.reported_at)
          : null,
    reviewedBy: row.reviewed_by != null ? String(row.reviewed_by) : null
  };
}

async function selectRowsByStatus(
  admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  table: string,
  status: TariffReportStatus | "all",
  limit: number
): Promise<Record<string, unknown>[]> {
  const max = Math.max(1, Math.min(200, limit));

  const runOrder = async (statusCol: "status" | "pending_admin_approval" | null) => {
    const applyFilter = (query: ReturnType<ReturnType<typeof admin.from>["select"]>) => {
      if (status === "all" || statusCol == null) return query;
      if (statusCol === "status") return query.eq("status", status);
      return query.eq("pending_admin_approval", status === "pending_admin_approval");
    };

    let r = await applyFilter(admin.from(table).select("*")).order("reported_at", { ascending: false }).limit(max);
    if (!r.error) return r;
    r = await applyFilter(admin.from(table).select("*")).order("created_at", { ascending: false }).limit(max);
    return r;
  };

  const build = (statusCol: "status" | "pending_admin_approval" | null) => {
    return runOrder(statusCol);
  };

  if (status === "all") {
    const { data, error } = await build(null);
    return !error && data ? (data as Record<string, unknown>[]) : [];
  }

  let res = await build("status");
  if (!res.error && res.data) return res.data as Record<string, unknown>[];
  if (res.error && containsMissingColumn(res.error.message)) {
    res = await build("pending_admin_approval");
    if (!res.error && res.data) return res.data as Record<string, unknown>[];
  }

  const fallback = await build(null);
  if (fallback.error || !fallback.data) return [];
  return (fallback.data as Record<string, unknown>[]).filter((row) => {
    const resolved = deriveStatus(row);
    return resolved === status;
  });
}

function normDedupeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function hasRecentDuplicate(
  admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  table: string,
  payload: {
    installerState: string;
    activeTariff: string;
    source: string;
    note: string | null;
    dedupeWindowHours: number;
  }
): Promise<{ found: boolean; id?: string }> {
  const { data, error } = await admin
    .from(table)
    .select("id,status,pending_admin_approval,reported_at,created_at,report_note")
    .eq("installer_state", payload.installerState)
    .eq("active_tariff", payload.activeTariff)
    .eq("source", payload.source)
    .order("reported_at", { ascending: false })
    .limit(25);
  if (error || !data?.length) return { found: false };
  const nowMs = Date.now();
  const windowMs = Math.max(1, payload.dedupeWindowHours) * 60 * 60 * 1000;
  const noteNorm = normDedupeText(payload.note ?? "");
  for (const row of data as Record<string, unknown>[]) {
    const status = deriveStatus(row);
    if (status !== "pending_admin_approval") continue;
    const tsRaw = row.reported_at ?? row.created_at;
    const tsMs = Date.parse(String(tsRaw ?? ""));
    if (!Number.isFinite(tsMs) || nowMs - tsMs > windowMs) continue;
    const rowNoteNorm = normDedupeText(String(row.report_note ?? ""));
    if (noteNorm && rowNoteNorm && rowNoteNorm !== noteNorm) continue;
    return { found: true, id: String(row.id ?? "") };
  }
  return { found: false };
}

async function updateAdaptive(
  admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  table: string,
  id: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; row?: Record<string, unknown>; error?: string }> {
  const attempt = { ...payload };
  let guard = 0;
  while (guard < 20 && Object.keys(attempt).length > 0) {
    guard += 1;
    const { data, error } = await admin.from(table).update(attempt).eq("id", id).select("*").maybeSingle();
    if (!error && data) return { ok: true, row: data as Record<string, unknown> };
    if (!error) return { ok: false, error: "No matching report row found." };
    const miss = missingColumn(error.message);
    if (miss && miss in attempt) {
      delete attempt[miss];
      continue;
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Could not apply approval update." };
}

export async function saveRateChangeReport(input: RateChangeReportInput): Promise<SaveResult> {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY missing — report logging disabled.",
      code: "config"
    };
  }

  const reportNote = input.note?.trim() || null;
  const dedupeWindowHours = Number.isFinite(input.dedupeWindowHours) ? Number(input.dedupeWindowHours) : 48;
  const payload = {
    installer_name: input.installerName.trim() || "Unknown Installer",
    installer_state: input.installerState.trim() || "Unknown State",
    active_tariff: input.activeTariff.trim() || "Unknown Tariff",
    report_note: reportNote,
    source: input.source ?? "more_manual",
    status: input.status ?? "pending_admin_approval",
    detected_rates: input.detectedRates ?? null,
    database_rates: input.databaseRates ?? null,
    pending_admin_approval: (input.status ?? "pending_admin_approval") !== "verified",
    admin_alert_required: true,
    reported_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  for (const table of CANDIDATE_TABLES) {
    const duplicate = await hasRecentDuplicate(admin, table, {
      installerState: payload.installer_state,
      activeTariff: payload.active_tariff,
      source: String(payload.source),
      note: reportNote,
      dedupeWindowHours
    });
    if (duplicate.found && duplicate.id) {
      return { ok: true, id: duplicate.id, table, duplicate: true };
    }
    const inserted = await insertAdaptive(admin, table, payload);
    if (inserted.ok && inserted.data?.id) {
      return { ok: true, id: String(inserted.data.id), table };
    }
  }

  return {
    ok: false,
    error: `Insert failed for ${CANDIDATE_TABLES.join(", ")}. Run latest Supabase migration.`,
    code: "db"
  };
}

export async function readLatestRateChangeStatus(input: {
  installerState: string;
  activeTariff: string;
}): Promise<{
  ok: boolean;
  status: "pending_admin_approval" | "verified" | "none";
  reportedAt: string | null;
  source: string | null;
  table: string | null;
}> {
  const admin = createSupabaseAdmin();
  if (!admin) return { ok: false, status: "none", reportedAt: null, source: null, table: null };

  for (const table of CANDIDATE_TABLES) {
    const { data, error } = await admin
      .from(table)
      .select("*")
      .eq("installer_state", input.installerState)
      .eq("active_tariff", input.activeTariff)
      .order("reported_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) continue;
    if (!data) continue;

    const row = data as Record<string, unknown>;
    const statusRaw = String(row.status ?? "");
    const status = statusRaw === "verified" ? "verified" : "pending_admin_approval";
    const reportedAt =
      row.reported_at != null ? String(row.reported_at) : row.created_at != null ? String(row.created_at) : null;
    const source = row.source != null ? String(row.source) : null;
    return { ok: true, status, reportedAt, source, table };
  }

  return { ok: true, status: "none", reportedAt: null, source: null, table: null };
}

export async function listTariffReports(
  status: TariffReportStatus | "all" = "all",
  limit = 100
): Promise<{ ok: boolean; data: TariffReportRow[]; error?: string }> {
  const admin = createSupabaseAdmin();
  if (!admin) return { ok: false, data: [], error: "SUPABASE_SERVICE_ROLE_KEY missing." };

  const rows: TariffReportRow[] = [];
  for (const table of CANDIDATE_TABLES) {
    const result = await selectRowsByStatus(admin, table, status, limit);
    rows.push(...result.map((row) => mapRow(table, row)));
  }

  rows.sort((a, b) => Date.parse(b.reportedAt ?? "") - Date.parse(a.reportedAt ?? ""));
  return { ok: true, data: rows.slice(0, limit) };
}

export async function approveTariffReport(input: {
  id: string;
  table: string;
  reviewedBy?: string | null;
}): Promise<{ ok: boolean; row?: TariffReportRow; error?: string }> {
  return reviewTariffReport({
    id: input.id,
    table: input.table,
    action: "approve",
    reviewedBy: input.reviewedBy
  });
}

export async function reviewTariffReport(input: {
  id: string;
  table: string;
  action: TariffReviewAction;
  reviewedBy?: string | null;
  reviewNote?: string | null;
}): Promise<{ ok: boolean; row?: TariffReportRow; error?: string }> {
  const admin = createSupabaseAdmin();
  if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY missing." };

  const table = CANDIDATE_TABLES.includes(input.table as (typeof CANDIDATE_TABLES)[number]) ? input.table : CANDIDATE_TABLES[0];
  const action = input.action;
  const status: TariffReportStatus = action === "approve" ? "verified" : action === "ignore" ? "ignored" : "false_positive";
  const adminActionTag = `[admin-action:${action}]`;
  const defaultReviewNote =
    action === "approve"
      ? "Approved by admin."
      : action === "ignore"
        ? "Ignored by admin."
        : "Marked false positive by admin.";
  const reviewNote = input.reviewNote?.trim();
  const nowIso = new Date().toISOString();
  const existing = await admin.from(table).select("report_note").eq("id", input.id).maybeSingle();
  const existingNote =
    !existing.error && existing.data && (existing.data as Record<string, unknown>).report_note != null
      ? String((existing.data as Record<string, unknown>).report_note)
      : "";
  const actionLine = `[history] ${nowIso} | action=${action} | by=${input.reviewedBy?.trim() || "admin"} | note=${reviewNote || defaultReviewNote}`;
  const mergedNote = [existingNote.trim(), actionLine].filter(Boolean).join("\n");
  const payload: Record<string, unknown> = {
    status,
    pending_admin_approval: (status as string) === "pending_admin_approval",
    admin_alert_required: false,
    reviewed_by: input.reviewedBy?.trim() || "admin",
    verified_at: action === "approve" ? nowIso : null,
    report_note: `${adminActionTag} ${mergedNote}`,
    updated_at: nowIso
  };
  const updated = await updateAdaptive(admin, table, input.id, payload);
  if (!updated.ok || !updated.row) return { ok: false, error: updated.error ?? "Approve failed." };
  return { ok: true, row: mapRow(table, updated.row) };
}
