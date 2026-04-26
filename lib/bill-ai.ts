import type { ParsedBillShape } from "@/lib/bill-parse";
import { analyzeBillWithAnthropic } from "@/lib/anthropic";

export type BillAiProvider = "anthropic";
export type BillAiModelTier = "haiku" | "sonnet";

export function resolveBillAiProvider(): BillAiProvider {
  return "anthropic";
}

export async function analyzeBillWithProvider(
  base64Data: string,
  mimeType: string,
  options?: { formatHint?: string }
): Promise<{ parsed: ParsedBillShape; provider: BillAiProvider; tier: BillAiModelTier }> {
  return analyzeBillWithAnthropicHybrid(base64Data, mimeType, options);
}

async function analyzeBillWithAnthropicHybrid(
  base64Data: string,
  mimeType: string,
  options?: { formatHint?: string }
): Promise<{ parsed: ParsedBillShape; provider: BillAiProvider; tier: BillAiModelTier }> {
  const haikuModel = (process.env.ANTHROPIC_HAIKU_MODEL || process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest").trim();
  const sonnetModel = (process.env.ANTHROPIC_SONNET_MODEL || "claude-3-5-sonnet-latest").trim();
  const sonnetEnabled = String(process.env.ANTHROPIC_ENABLE_SONNET_FALLBACK ?? "true").toLowerCase() !== "false";
  const minConfidenceRaw = Number(process.env.AI_MIN_PARSE_CONFIDENCE ?? 45);
  const minConfidence = Number.isFinite(minConfidenceRaw) ? Math.max(0, Math.min(100, minConfidenceRaw)) : 55;
  const minMonthsRaw = Number(process.env.AI_MIN_FILLED_MONTHS ?? 3);
  const minMonths = Number.isFinite(minMonthsRaw) ? Math.max(1, Math.min(12, minMonthsRaw)) : 4;

  try {
    const haikuParsed = await analyzeBillWithAnthropic(base64Data, mimeType, {
      formatHint: options?.formatHint,
      modelOverride: haikuModel
    });
    if (!sonnetEnabled) {
      return { parsed: haikuParsed, provider: "anthropic", tier: "haiku" };
    }
    if (!needsSonnetEscalation(haikuParsed, { minConfidence, minMonths })) {
      return { parsed: haikuParsed, provider: "anthropic", tier: "haiku" };
    }
    try {
      const sonnetParsed = await analyzeBillWithAnthropic(base64Data, mimeType, {
        formatHint: options?.formatHint,
        modelOverride: sonnetModel
      });
      return { parsed: sonnetParsed, provider: "anthropic", tier: "sonnet" };
    } catch (error) {
      console.warn("[bill-ai] sonnet escalation failed, using haiku result:", error);
      return { parsed: haikuParsed, provider: "anthropic", tier: "haiku" };
    }
  } catch (error) {
    if (!sonnetEnabled) throw error;
    const sonnetParsed = await analyzeBillWithAnthropic(base64Data, mimeType, {
      formatHint: options?.formatHint,
      modelOverride: sonnetModel
    });
    return { parsed: sonnetParsed, provider: "anthropic", tier: "sonnet" };
  }
}

function needsSonnetEscalation(
  parsed: ParsedBillShape,
  thresholds: { minConfidence: number; minMonths: number }
): boolean {
  const confidence = estimateParseConfidence(parsed);
  const monthsCount = countFilledMonths(parsed.months);
  if (monthsCount < thresholds.minMonths) return true;
  if (confidence < thresholds.minConfidence && monthsCount < 6) return true;
  if (!parsed.bill_month?.trim()) return true;
  return false;
}

function countFilledMonths(months: ParsedBillShape["months"] | undefined): number {
  if (!months) return 0;
  return Object.values(months).filter((v) => {
    if (typeof v === "number") return Number.isFinite(v) && v > 0;
    if (typeof v === "string") return /\d/.test(v);
    return false;
  }).length;
}

function estimateParseConfidence(parsed: {
  state?: string;
  discom?: string;
  consumer_id?: string;
  bill_month?: string;
  total_amount_payable_inr?: number | string | null;
  months?: Partial<Record<string, number | string | null>>;
}): number {
  let score = 0;
  if (parsed.state?.trim()) score += 20;
  if (parsed.discom?.trim()) score += 20;
  if (parsed.consumer_id?.trim()) score += 15;
  if (parsed.bill_month?.trim()) score += 10;
  const totalRaw =
    typeof parsed.total_amount_payable_inr === "number"
      ? parsed.total_amount_payable_inr
      : parseFloat(String(parsed.total_amount_payable_inr ?? "").replace(/[^\d.]/g, ""));
  if (Number.isFinite(totalRaw) && totalRaw > 0) score += 15;
  const months = parsed.months ?? {};
  const monthHits = Object.values(months).filter((v) => {
    if (typeof v === "number") return Number.isFinite(v) && v > 0;
    if (typeof v === "string") return /\d/.test(v);
    return false;
  }).length;
  score += Math.min(20, monthHits * 3);
  return Math.max(0, Math.min(100, Math.round(score)));
}
