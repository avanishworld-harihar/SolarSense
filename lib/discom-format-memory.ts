import { supabase } from "@/lib/supabase";

export function normalizeDiscomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

const HINT_MAX = 2000;
const QUERY_TIMEOUT_MS = 2500;
const MISSING_TABLE_COOLDOWN_MS = 15 * 60_000;
let discomFormatsTemporarilyDisabledUntil = 0;

function isMissingDiscomFormatsTable(message: string): boolean {
  return /discom_formats/i.test(message) && /(schema cache|does not exist|relation|not find the table)/i.test(message);
}

function canQueryDiscomFormats(): boolean {
  return Date.now() >= discomFormatsTemporarilyDisabledUntil;
}

function disableDiscomFormatsTemporarily(): void {
  discomFormatsTemporarilyDisabledUntil = Date.now() + MISSING_TABLE_COOLDOWN_MS;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("discom_formats timeout")), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Load saved “where is history on this DISCOM bill” hint for Gemini.
 */
export async function getDiscomFormatHint(discomRaw: string): Promise<string | null> {
  if (!supabase) return null;
  if (!canQueryDiscomFormats()) return null;
  const code = normalizeDiscomCode(discomRaw);
  if (!code) return null;
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("discom_formats")
        .select("history_extraction_hint")
        .eq("discom_code", code)
        .maybeSingle(),
      QUERY_TIMEOUT_MS
    );
    if (error) {
      if (isMissingDiscomFormatsTable(error.message)) disableDiscomFormatsTemporarily();
      return null;
    }
    if (!data?.history_extraction_hint) return null;
    return String(data.history_extraction_hint).trim() || null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingDiscomFormatsTable(message)) disableDiscomFormatsTemporarily();
    return null;
  }
}

/**
 * Save or refresh template memory after a successful parse (format_memory from model).
 */
export async function upsertDiscomFormatHint(discomRaw: string, hint: string): Promise<void> {
  if (!supabase) return;
  if (!canQueryDiscomFormats()) return;
  const code = normalizeDiscomCode(discomRaw);
  const h = hint.trim().slice(0, HINT_MAX);
  if (!code || !h) return;
  try {
    const { error } = await withTimeout(
      supabase.from("discom_formats").upsert(
        {
          discom_code: code,
          history_extraction_hint: h,
          updated_at: new Date().toISOString()
        },
        { onConflict: "discom_code" }
      ),
      QUERY_TIMEOUT_MS
    );
    if (!error) return;
    if (isMissingDiscomFormatsTable(error.message)) {
      disableDiscomFormatsTemporarily();
      return;
    }
    console.warn("[discom_formats] upsert failed:", error.message);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingDiscomFormatsTable(message)) {
      disableDiscomFormatsTemporarily();
      return;
    }
    console.warn("[discom_formats] upsert failed:", message);
  }
}
