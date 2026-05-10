import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { upsertDiscomBillProfile } from "@/lib/discom-bill-profile";

export type BillLearningReviewStatus = "pending" | "approved" | "rejected";

export type BillLearningReviewRow = {
  id: string;
  status: BillLearningReviewStatus;
  state: string;
  discom: string;
  historyWindowMonths: number;
  requiredBills: number;
  confidence: number | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
};

type Row = Record<string, unknown>;

function missingColumn(errMessage: string): string | null {
  const m = /Could not find the '([^']+)' column/i.exec(errMessage);
  return m?.[1] ?? null;
}

async function insertAdaptive(client: NonNullable<ReturnType<typeof createSupabaseAdmin>>, payload: Row): Promise<boolean> {
  const attempt = { ...payload };
  let guard = 0;
  while (guard < 25 && Object.keys(attempt).length > 0) {
    guard += 1;
    const { error } = await client.from("bill_learning_reviews").insert(attempt);
    if (!error) return true;
    const miss = missingColumn(error.message);
    if (miss && miss in attempt) {
      delete attempt[miss];
      continue;
    }
    console.warn("[bill-learning-reviews] insert failed:", error.message);
    return false;
  }
  return false;
}

export async function queueBillLearningReview(input: {
  state: string;
  discom: string;
  historyWindowMonths: number;
  requiredBills: number;
  confidence: number;
  source: string;
  metadata?: Record<string, unknown> | null;
}): Promise<{ ok: boolean }> {
  const admin = createSupabaseAdmin();
  if (!admin) return { ok: false };
  const ok = await insertAdaptive(admin, {
    status: "pending",
    state: input.state.trim(),
    discom: input.discom.trim(),
    history_window_months: Math.max(1, Math.round(input.historyWindowMonths)),
    required_bills: Math.max(1, Math.round(input.requiredBills)),
    confidence: input.confidence,
    source: input.source,
    metadata: input.metadata ?? null
  });
  return { ok };
}

function mapRow(r: Row): BillLearningReviewRow {
  const st = String(r.status ?? "pending").toLowerCase();
  const status: BillLearningReviewStatus =
    st === "approved" || st === "rejected" ? st : "pending";
  return {
    id: String(r.id ?? ""),
    status,
    state: String(r.state ?? ""),
    discom: String(r.discom ?? ""),
    historyWindowMonths: Number(r.history_window_months ?? r.historyWindowMonths ?? 0) || 0,
    requiredBills: Number(r.required_bills ?? r.requiredBills ?? 0) || 0,
    confidence: r.confidence != null ? Number(r.confidence) : null,
    source: r.source != null ? String(r.source) : null,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.created_at != null ? String(r.created_at) : null,
    reviewedAt: r.reviewed_at != null ? String(r.reviewed_at) : null,
    reviewedBy: r.reviewed_by != null ? String(r.reviewed_by) : null,
    reviewNote: r.review_note != null ? String(r.review_note) : null
  };
}

export async function listBillLearningReviews(input: {
  status?: BillLearningReviewStatus | "all";
  limit?: number;
}): Promise<{ ok: true; data: BillLearningReviewRow[] } | { ok: false; error: string }> {
  const admin = createSupabaseAdmin();
  if (!admin) return { ok: false, error: "supabase_admin_unavailable" };
  const max = Math.max(1, Math.min(200, input.limit ?? 80));
  let q = admin.from("bill_learning_reviews").select("*").order("created_at", { ascending: false }).limit(max);
  if (input.status && input.status !== "all") {
    q = q.eq("status", input.status);
  }
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: ((data as Row[]) ?? []).map(mapRow) };
}

export async function reviewBillLearningReview(input: {
  id: string;
  action: "approve" | "reject";
  reviewedBy?: string | null;
  reviewNote?: string | null;
}): Promise<{ ok: true; row: BillLearningReviewRow } | { ok: false; error: string }> {
  const admin = createSupabaseAdmin();
  if (!admin) return { ok: false, error: "supabase_admin_unavailable" };

  const { data: raw, error: fetchErr } = await admin
    .from("bill_learning_reviews")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  if (fetchErr || !raw) return { ok: false, error: fetchErr?.message ?? "not_found" };

  const row = raw as Row;
  if (String(row.status ?? "").toLowerCase() !== "pending") {
    return { ok: false, error: "already_reviewed" };
  }

  if (input.action === "reject") {
    const { data: updated, error } = await admin
      .from("bill_learning_reviews")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: input.reviewedBy?.trim() || null,
        review_note: input.reviewNote?.trim() || null
      })
      .eq("id", input.id)
      .select("*")
      .maybeSingle();
    if (error || !updated) return { ok: false, error: error?.message ?? "update_failed" };
    return { ok: true, row: mapRow(updated as Row) };
  }

  const applied = await upsertDiscomBillProfile({
    state: String(row.state ?? ""),
    discom: String(row.discom ?? ""),
    historyWindowMonths: Number(row.history_window_months ?? 6) || 6,
    requiredBills: Number(row.required_bills ?? 1) || 1,
    confidence: row.confidence != null ? Number(row.confidence) : 0.82,
    source: String(row.source ?? "self_learning_ai_scan_approved")
  });
  if (!applied.ok) {
    return { ok: false, error: applied.error ?? "profile_upsert_failed" };
  }

  const { data: updated, error } = await admin
    .from("bill_learning_reviews")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.reviewedBy?.trim() || null,
      review_note: input.reviewNote?.trim() || null
    })
    .eq("id", input.id)
    .select("*")
    .maybeSingle();
  if (error || !updated) return { ok: false, error: error?.message ?? "update_failed" };
  return { ok: true, row: mapRow(updated as Row) };
}
