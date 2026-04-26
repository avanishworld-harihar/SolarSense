import type { ParsedBillShape } from "@/lib/bill-parse";
import type { MonthlyUnits } from "@/lib/types";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "verified-bills-training";

function extFromMime(mime: string): string {
  const m = mime.split(";")[0]?.trim().toLowerCase() || "image/jpeg";
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/heic") return "heic";
  if (m === "application/pdf") return "pdf";
  return "bin";
}

export type SaveVerifiedBillTrainingInput = {
  base64Data: string;
  mimeType: string;
  billData: ParsedBillShape;
  /** Snapshot of grid after merge (keys may be subset of months). */
  monthlyUnits?: Partial<MonthlyUnits> | Record<string, number> | null;
  notes?: string | null;
  appVersion?: string | null;
};

export type SaveVerifiedBillTrainingResult =
  | { ok: true; id: string; storagePath: string }
  | { ok: false; error: string; code: "config" | "storage" | "db" };

/**
 * Uploads raw bill file to Storage and inserts a row. Requires SUPABASE_SERVICE_ROLE_KEY on the server.
 */
export async function saveVerifiedBillTraining(input: SaveVerifiedBillTrainingInput): Promise<SaveVerifiedBillTrainingResult> {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY missing — training save disabled.", code: "config" };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(input.base64Data, "base64");
  } catch {
    return { ok: false, error: "Invalid base64 payload.", code: "config" };
  }

  if (buffer.length < 80) {
    return { ok: false, error: "File too small.", code: "config" };
  }

  const mime = input.mimeType.split(";")[0]?.trim().toLowerCase() || "image/jpeg";
  const id = crypto.randomUUID();
  const storagePath = `${id}.${extFromMime(mime)}`;

  const { error: upErr } = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: mime,
    upsert: false
  });

  if (upErr) {
    return { ok: false, error: upErr.message, code: "storage" };
  }

  const { data: row, error: insErr } = await admin
    .from("verified_bills_training")
    .insert({
      storage_path: storagePath,
      mime_type: mime,
      bill_data: input.billData as Record<string, unknown>,
      monthly_units: input.monthlyUnits ?? null,
      notes: input.notes?.trim() || null,
      app_version: input.appVersion?.trim() || null
    })
    .select("id")
    .single();

  if (insErr || !row?.id) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: insErr?.message ?? "Insert failed", code: "db" };
  }

  return { ok: true, id: String(row.id), storagePath };
}
