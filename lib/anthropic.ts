import { extractJsonFromModelText } from "@/lib/bill-parse";
import type { ParsedBillShape } from "@/lib/bill-parse";
import { normalizeParsedBillShape } from "@/lib/gemini";

const DEFAULT_MODEL = "claude-3-5-haiku-latest";
const MODEL_FALLBACKS = [
  "claude-3-5-haiku-latest",
  "claude-3-haiku-20240307",
  "claude-3-5-sonnet-latest",
  "claude-3-sonnet-20240229"
];
const DEFAULT_TIMEOUT_MS = 20_000;
const API_VERSION = "2023-06-01";

type AnthropicPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      source: {
        type: "base64";
        media_type: string;
        data: string;
      };
    }
  | {
      type: "document";
      source: {
        type: "base64";
        media_type: "application/pdf";
        data: string;
      };
    };

export type AnalyzeBillAnthropicOptions = {
  formatHint?: string;
  modelOverride?: string;
};

export async function analyzeBillWithAnthropic(
  base64Data: string,
  mimeType: string,
  options?: AnalyzeBillAnthropicOptions
): Promise<ParsedBillShape> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) throw new Error("ANTHROPIC_API_KEY is missing. Add it to .env.local.");

  const preferredModel = (options?.modelOverride || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const modelCandidates = buildModelCandidates(preferredModel);
  const timeoutRaw = Number(process.env.ANTHROPIC_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeoutRaw) ? Math.max(5_000, Math.min(45_000, timeoutRaw)) : DEFAULT_TIMEOUT_MS;

  const hintBlock = options?.formatHint?.trim() ? `\nDISCOM hint memory: ${options.formatHint.trim()}\n` : "";
  const prompt = `Extract bill fields from this Indian electricity bill image/PDF.
Return ONLY valid JSON (no markdown), exactly this shape:
{"name":"","address":"","consumer_id":"","meter_number":"","connection_date":"","sanctioned_load":"","phase":"Single or Three","connection_type":"purpose as printed e.g. Shops/Showrooms or Domestic","purpose_of_supply":"","tariff_category":"exact tariff code e.g. LV2 [LV2.2]","contract_demand_kva":null,"discom":"","state":"","district":"","country":"India","bill_month":"","registered_mobile":"","fixed_charges_inr":null,"energy_charges_inr":null,"electricity_duty_inr":null,"regulatory_surcharges_inr":null,"total_amount_payable_inr":null,"read_type":"","bill_type_label":"","metered_unit_consumption":null,"total_amount_till_due_inr":null,"total_amount_after_due_inr":null,"current_month_bill_amount_inr":null,"principal_arrear_inr":null,"amount_received_against_bill_inr":null,"mp_govt_subsidy_amount_inr":null,"fppas_inr":null,"rebate_incentive_inr":null,"ccb_adjustment_inr":null,"nfp_flag":false,"strict_audit_mode":"strict_v1","strict_audit_notes":[],"months":{"jan":null,"feb":null,"mar":null,"apr":null,"may":null,"jun":null,"jul":null,"aug":null,"sep":null,"oct":null,"nov":null,"dec":null},"consumption_history":[],"format_memory":"","tariff_slabs_detected":[]}
${hintBlock}
Rules:
1) STRICT AUDIT: use only values explicitly printed on bill; no assumptions.
2) Unknown text="", unknown numbers=null; if uncertain/blurred add short note to strict_audit_notes.
3) Never infer meter type from section labels (e.g. "Smart Meter RC/DC Amount Received" is not meter type).
4) CRITICAL — tariff_category: copy the EXACT tariff code string as printed (e.g. "LV2 [LV2.2]", "LV 1.2").
5) CRITICAL — sanctioned_load: copy EXACTLY as printed including units (e.g. "5.0 KW").
6) purpose_of_supply AND connection_type: copy the printed PURPOSE/use line into BOTH (e.g. Shops/Showrooms, School, Domestic, Hospital).
7) Separate charge lines exactly: fixed_charges_inr, energy_charges_inr, electricity_duty_inr, fppas_inr, regulatory_surcharges_inr. Do NOT mix Time-of-Day (ToD) energy into flat energy lines — note in strict_audit_notes if ToD is present.
8) contract_demand_kva: numeric kVA only if "Contract Demand" is printed separately.
9) Include consumption_history rows as {"month":"...","units":number}.
10) tariff_slabs_detected: [] if slab table not visible.
11) Set nfp_flag=true only when "NFP" or "Not For Payment" text is explicitly present.
Return ONLY the JSON object.`;

  const content: AnthropicPart[] = [
    mimeType === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64Data }
        }
      : {
          type: "image",
          source: { type: "base64", media_type: mimeType || "image/jpeg", data: base64Data }
        },
    { type: "text", text: prompt }
  ];

  let lastError: Error | null = null;
  for (const model of modelCandidates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": API_VERSION
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          temperature: 0,
          messages: [{ role: "user", content }]
        }),
        signal: controller.signal
      });
      const raw = await response.text();
      if (!response.ok) {
        throw new Error(toUserFacingAnthropicError(response.status, raw));
      }

      const parsedBody = JSON.parse(raw) as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const text = (parsedBody.content ?? []).find((row) => row.type === "text")?.text ?? "";
      if (!text.trim()) throw new Error("No text from Anthropic.");

      const parsed = extractJsonFromModelText(text) as Record<string, unknown>;
      return normalizeParsedBillShape(parsed);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Bill scan timed out on Claude. Please retry with a clearer image or smaller PDF.");
      }
      const asError = error instanceof Error ? error : new Error(String(error ?? "Anthropic request failed."));
      lastError = asError;
      if (!isModelSelectionError(asError)) throw asError;
      console.warn(`[anthropic] model '${model}' unavailable, trying fallback model.`);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error("Claude request failed: no compatible model available.");
}

function toUserFacingAnthropicError(status: number, rawBody: string): string {
  if (status === 401 || status === 403) {
    return "Claude API key is invalid or does not have permission.";
  }
  if (status === 429) {
    return "Claude API rate limit reached. Please retry shortly.";
  }
  if (status >= 500) {
    return "Claude service is temporarily unavailable. Please retry.";
  }
  try {
    const parsed = JSON.parse(rawBody) as { error?: { message?: string } };
    const msg = parsed.error?.message?.trim();
    if (msg) return `Claude request failed: ${msg}`;
  } catch {
    // ignore parse failures
  }
  return `Claude request failed (${status}).`;
}

function buildModelCandidates(preferredModel: string): string[] {
  const envFallbacks = String(process.env.ANTHROPIC_MODEL_FALLBACKS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const merged = [preferredModel, ...envFallbacks, ...MODEL_FALLBACKS];
  return merged.filter((model, idx) => merged.indexOf(model) === idx);
}

function isModelSelectionError(error: Error): boolean {
  return /model.*unavailable|model.*not found|invalid model|does not have permission|not available for this api key|model:\s*claude-|unknown model|not_found_error/i.test(
    error.message
  );
}
