import { supabase } from "./supabase";
import { canQueryDiscomFormats, disableDiscomFormatsTemporarily, isMissingDiscomFormatsTable } from "./discom-registry";

// 1. Timeout wrapper function
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error("discom_formats timeout")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer!) clearTimeout(timer);
  }
}

function normalizeDiscomCode(discom: string) {
  return discom.toLowerCase().trim();
}

/**
 * Load saved "where is history on this DISCOM bill" hint for Gemini.
 */
export async function getDiscomFormatHint(discomRaw: string): Promise<string | null> {
  if (!supabase) return null;
  if (!canQueryDiscomFormats()) return null;
  const code = normalizeDiscomCode(discomRaw);
  if (!code) return null;

  try {
    // Force casting the whole Supabase query to 'any' to bypass Vercel build issues
    const response: any = await withTimeout(
      supabase
        .from("discom_formats")
        .select("history_extraction_hint")
        .eq("code", code)
        .single() as any,
      10000
    );

    const { data, error } = response;

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
 * Save or refresh template memory after a successful parse.
 */
export async function upsertDiscomFormatHint(discomRaw: string, hint: string): Promise<void> {
  if (!supabase) return;
  if (!canQueryDiscomFormats()) return;
  const code = normalizeDiscomCode(discomRaw);
  if (!code || !hint) return;

  try {
    const { error } = await supabase
      .from("discom_formats")
      .upsert({ 
        code, 
        history_extraction_hint: hint,
        updated_at: new Date().toISOString()
      }, { onConflict: 'code' });

    if (error && isMissingDiscomFormatsTable(error.message)) {
      disableDiscomFormatsTemporarily();
    }
  } catch (err) {
    // Silent fail for background tasks
  }
}