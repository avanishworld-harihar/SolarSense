import { extractJsonFromModelText } from "@/lib/bill-parse";
import type { ParsedBillShape } from "@/lib/bill-parse";

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

/** Override with GEMINI_MODEL; default keeps fast vision path. */
const DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_API_VERSION = "v1beta" as const;
const DEFAULT_TIMEOUT_MS = 12_000;

function toNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = parseFloat(cleaned.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

type GeminiCallResult = {
  ok: true;
  body: string;
  model: string;
  version: typeof GEMINI_API_VERSION;
};

type GeminiCallError = {
  ok: false;
  status: number;
  body: string;
  model: string;
  version: typeof GEMINI_API_VERSION;
};

const KEY_FAILURE_TTL_MS = 10 * 60_000;
const keyFailureCache = new Map<string, { expiresAt: number; reason: string }>();

export type AnalyzeBillGeminiOptions = {
  /** Injected from Supabase discom_formats — where history table lives on this DISCOM */
  formatHint?: string;
};

export async function analyzeBillWithGemini(
  base64Data: string,
  mimeType: string,
  options?: AnalyzeBillGeminiOptions
): Promise<ParsedBillShape> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) throw new Error("GEMINI_API_KEY is missing. Add it to .env.local.");
  const keyPrefix = apiKey.slice(0, 12);
  const cachedFailure = keyFailureCache.get(keyPrefix);
  if (cachedFailure && cachedFailure.expiresAt > Date.now()) {
    throw new Error(cachedFailure.reason);
  }

  const configuredModel = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const timeoutMsRaw = Number(process.env.GEMINI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeoutMsRaw) ? Math.max(4_000, Math.min(30_000, timeoutMsRaw)) : DEFAULT_TIMEOUT_MS;
  const hintBlock =
    options?.formatHint?.trim() ?
      `\nDISCOM template memory (use to find history faster): ${options.formatHint.trim()}\n`
    : "";

  const prompt = `Extract bill fields from this Indian electricity bill image/PDF.
Return ONLY valid JSON (no markdown), exactly this shape:
{"name":"","address":"","consumer_id":"","meter_number":"","connection_date":"","sanctioned_load":"","phase":"Single or Three","connection_type":"purpose as printed e.g. Shops/Showrooms or Domestic","purpose_of_supply":"","tariff_category":"","contract_demand_kva":null,"discom":"","state":"","district":"","country":"India","bill_month":"","fixed_charges_inr":null,"energy_charges_inr":null,"electricity_duty_inr":null,"regulatory_surcharges_inr":null,"fppas_inr":null,"total_amount_payable_inr":null,"read_type":"","bill_type_label":"","metered_unit_consumption":null,"total_amount_till_due_inr":null,"total_amount_after_due_inr":null,"current_month_bill_amount_inr":null,"principal_arrear_inr":null,"amount_received_against_bill_inr":null,"mp_govt_subsidy_amount_inr":null,"rebate_incentive_inr":null,"ccb_adjustment_inr":null,"nfp_flag":false,"strict_audit_mode":"strict_v1","strict_audit_notes":[],"months":{"jan":null,"feb":null,"mar":null,"apr":null,"may":null,"jun":null,"jul":null,"aug":null,"sep":null,"oct":null,"nov":null,"dec":null},"consumption_history":[],"format_memory":"","tariff_slabs_detected":[]}
${hintBlock}
INDIAN ELECTRICITY BILL STRUCTURE (read carefully before extracting):
• CURRENT MONTH section (top/header area): Bill Month, Billing Date, Metered Unit Consumption (= actual units consumed this month = Current Reading MINUS Previous Reading, a 2–3 digit number like 170 or 419), Current Reading (4–6 digit meter accumulator like 12847), Previous Reading (4–6 digit accumulator like 12406), Read Type, Bill Type. All charge lines (Fixed Charge, Energy Charges, FPPAS, Electricity Duty, Subsidy, Rebate, Arrear, CCB) also belong to current month.
• LAST SIX MONTHS CONSUMPTION table (lower section): Shows history. It contains 5 recent previous months PLUS one "same month last year" entry (often bold or listed first) as a year-on-year comparison reference. Example: bill_month=APR-2026 → table shows APR-2025 (same month last year), NOV-2025, DEC-2025, JAN-2026, FEB-2026, MAR-2026.
• BILLING DETAILS / CHARGE BREAKDOWN: separate section with all INR charge line items.
• CRITICAL — metered_unit_consumption vs meter reading: metered_unit_consumption is the NET UNITS consumed (Current Reading − Previous Reading = typically 100–600 units for domestic). Current Reading and Previous Reading are large accumulator values (4–6 digits, e.g. 12847). NEVER use a 4–6 digit accumulator value as metered_unit_consumption.

Rules:
1) STRICT AUDIT: use only printed values; no inference/assumptions.
2) Unknown text="", unknown numbers=null, and add note in strict_audit_notes when uncertain.
3) Do NOT infer meter type from section headers (e.g. "Smart Meter RC/DC Amount Received" is not meter type).
4) PURPOSE: copy purpose_of_supply like connection_type (Shops/Showrooms, School, Hospital, Domestic). If only one line exists, duplicate it in both fields.
5) CHARGES: extract fixed_charges_inr, energy_charges_inr, electricity_duty_inr, fppas_inr, regulatory_surcharges_inr as separate printed lines. Note in strict_audit_notes if ToD surcharges are mixed with flat energy.
6) contract_demand_kva: only if "Contract Demand" or similar is printed separately (number in kVA).
7) consumption_history: include EVERY row from the history table as {"month":"MMM-YYYY","units":number} — including the "same month last year" row. Always include the year in month label (e.g. "APR-2025").
8) CRITICAL — months object (year-disambiguation): months keys jan–dec have NO year field, so:
   a) Current bill month key → ALWAYS set from metered_unit_consumption (round to integer). Example: bill_month="APR-2026" → months.apr = round(metered_unit_consumption). NEVER use the history table for this key.
   b) Previous months → use the 5 recent history months from the current billing year window. Map EACH row to its EXACT labelled month — DO NOT shift or swap month assignments. NOV-2025 row → months.nov. DEC-2025 row → months.dec. Never assign a value from one month's row to a different month key.
   c) "Same month last year" row → put in consumption_history ONLY. NEVER write to months (not even to the same-month key). Example: DEC-2024 bold row in a DEC-2025 bill → consumption_history only, NOT months.dec.
   d) CONFUSION GUARD example: DEC-2025 bill has metered=194 units (for DEC). History shows NOV-2025: 276. Set months.dec=194, months.nov=276. Do NOT put 194 into months.nov — that is DEC's value.
9) format_memory: one short sentence on where monthly history appears; else "".
10) tariff_slabs_detected: [] if slab table not visible.
11) nfp_flag=true only if "NFP" or "Not For Payment" is explicitly printed.
Return ONLY the JSON object.`;

  const parts: GeminiPart[] = [
    { inline_data: { mime_type: mimeType || "image/jpeg", data: base64Data } },
    { text: prompt }
  ];

  const result = await callGeminiGenerateContent({
    apiKey,
    model: configuredModel,
    version: GEMINI_API_VERSION,
    parts,
    timeoutMs
  });
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      keyFailureCache.set(keyPrefix, {
        expiresAt: Date.now() + KEY_FAILURE_TTL_MS,
        reason: "Gemini API key is invalid or does not have permission for bill scanning models."
      });
    }
    throw new Error(toUserFacingGeminiError(result));
  }
  const rawBody = result.body;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw new Error("Gemini returned non-JSON body");
  }

  const candidate = (data.candidates as Record<string, unknown>[] | undefined)?.[0];
  const text =
    (candidate?.content as { parts?: { text?: string }[] } | undefined)?.parts?.[0]?.text ??
    "";

  if (!text || typeof text !== "string") {
    const finish = candidate?.finishReason ?? "unknown";
    const block = (data.promptFeedback as { blockReason?: string } | undefined)?.blockReason;
    throw new Error(`No text from Gemini (finish: ${String(finish)}${block ? `, block: ${block}` : ""})`);
  }

  const parsed = extractJsonFromModelText(text) as Record<string, unknown>;
  return normalizeParsedBillShape(parsed);
}

async function callGeminiGenerateContent(input: {
  apiKey: string;
  model: string;
  version: typeof GEMINI_API_VERSION;
  parts: GeminiPart[];
  timeoutMs: number;
}): Promise<GeminiCallResult | GeminiCallError> {
  const { apiKey, model, version, parts, timeoutMs } = input;
  const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
      }),
      signal: controller.signal
    });
    const body = await response.text();
    if (response.ok) return { ok: true, body, model, version };
    return { ok: false, status: response.status, body, model, version };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: aborted ? 408 : 503,
      body: aborted ? "Gemini request timeout" : String(error),
      model,
      version
    };
  } finally {
    clearTimeout(timeout);
  }
}

function toUserFacingGeminiError(error: GeminiCallError): string {
  if (error.status === 404) {
    return "Bill scanner model is unavailable for this API key. Please set GEMINI_MODEL to an allowed Flash model.";
  }
  if (error.status === 401 || error.status === 403) {
    return "Gemini API key is invalid or does not have permission for bill scanning models.";
  }
  if (error.status === 408) {
    return "Bill scan timed out. Please retry with a clearer image or smaller PDF.";
  }
  if (error.status === 429) {
    return "Gemini API rate limit reached. Please retry after a short while.";
  }
  if (error.status >= 500) {
    return "Gemini service is temporarily unavailable. Please retry.";
  }
  return `Gemini request failed (${error.status}). Please verify model access and API settings.`;
}

/** Coerce model quirks (snake/camel) and sanitize consumption_history. */
export function normalizeParsedBillShape(raw: Record<string, unknown>): ParsedBillShape {
  const chRaw = raw.consumption_history ?? raw.consumptionHistory;
  let consumption_history: ParsedBillShape["consumption_history"];
  if (Array.isArray(chRaw)) {
    consumption_history = chRaw
      .map((row) => {
        const o = row as Record<string, unknown>;
        const month = String(o.month ?? o.Month ?? o.period ?? "").trim();
        const u = o.units ?? o.unit ?? o.kwh ?? o.consumption;
        const units = typeof u === "number" && Number.isFinite(u) ? Math.round(u) : parseInt(String(u ?? "").replace(/[^\d]/g, ""), 10);
        if (!month || !Number.isFinite(units) || units <= 0) return null;
        return { month, units };
      })
      .filter(Boolean) as NonNullable<ParsedBillShape["consumption_history"]>;
  }

  const fm = raw.format_memory ?? raw.formatMemory;
  const format_memory = typeof fm === "string" ? fm.trim().slice(0, 2000) : undefined;
  const tariffSlabsRaw = raw.tariff_slabs_detected ?? raw.tariffSlabsDetected;
  const tariff_slabs_detected = Array.isArray(tariffSlabsRaw)
    ? tariffSlabsRaw
        .map((row) => {
          const o = row as Record<string, unknown>;
          const rateRaw = o.rate_per_unit ?? o.rate ?? o.unit_rate;
          const rate =
            typeof rateRaw === "number" && Number.isFinite(rateRaw)
              ? rateRaw
              : parseFloat(String(rateRaw ?? "").replace(/[^\d.]/g, ""));
          if (!Number.isFinite(rate) || rate <= 0) return null;
          const fromRaw = o.from_unit ?? o.from ?? o.min ?? null;
          const toRaw = o.to_unit ?? o.to ?? o.max ?? null;
          const from =
            fromRaw == null ? null : typeof fromRaw === "number" ? fromRaw : parseInt(String(fromRaw).replace(/[^\d]/g, ""), 10);
          const to = toRaw == null ? null : typeof toRaw === "number" ? toRaw : parseInt(String(toRaw).replace(/[^\d]/g, ""), 10);
          const unit_label = String(o.unit_label ?? o.label ?? "").trim() || undefined;
          return {
            from_unit: Number.isFinite(from as number) ? (from as number) : null,
            to_unit: Number.isFinite(to as number) ? (to as number) : null,
            rate_per_unit: Math.round(rate * 1000) / 1000,
            unit_label
          };
        })
        .filter(Boolean) as NonNullable<ParsedBillShape["tariff_slabs_detected"]>
    : undefined;

  const base = { ...raw } as ParsedBillShape;
  const strictNotesRaw = raw.strict_audit_notes ?? raw.strictAuditNotes;
  const strict_audit_notes = Array.isArray(strictNotesRaw)
    ? strictNotesRaw
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
        .slice(0, 30)
    : undefined;
  const nfpRaw = raw.nfp_flag ?? raw.nfpFlag;
  const nfp_flag =
    typeof nfpRaw === "boolean" ? nfpRaw : /^(true|yes|1|nfp)$/i.test(String(nfpRaw ?? "").trim());
  return {
    ...base,
    metered_unit_consumption: toNullableNumber(raw.metered_unit_consumption ?? raw.meteredUnitConsumption),
    total_amount_till_due_inr: toNullableNumber(raw.total_amount_till_due_inr ?? raw.totalAmountTillDueInr),
    total_amount_after_due_inr: toNullableNumber(raw.total_amount_after_due_inr ?? raw.totalAmountAfterDueInr),
    current_month_bill_amount_inr: toNullableNumber(raw.current_month_bill_amount_inr ?? raw.currentMonthBillAmountInr),
    principal_arrear_inr: toNullableNumber(raw.principal_arrear_inr ?? raw.principalArrearInr),
    amount_received_against_bill_inr: toNullableNumber(
      raw.amount_received_against_bill_inr ?? raw.amountReceivedAgainstBillInr
    ),
    mp_govt_subsidy_amount_inr: toNullableNumber(raw.mp_govt_subsidy_amount_inr ?? raw.mpGovtSubsidyAmountInr),
    fppas_inr: toNullableNumber(raw.fppas_inr ?? raw.fppasInr),
    electricity_duty_inr: toNullableNumber(raw.electricity_duty_inr ?? raw.electricityDutyInr),
    regulatory_surcharges_inr: toNullableNumber(
      raw.regulatory_surcharges_inr ?? raw.regulatorySurchargesInr
    ),
    purpose_of_supply: (() => {
      const p = String(raw.purpose_of_supply ?? raw.purposeOfSupply ?? "").trim();
      const c = String(raw.connection_type ?? raw.connectionType ?? "").trim();
      return (p || c) || undefined;
    })(),
    contract_demand_kva: toNullableNumber(raw.contract_demand_kva ?? raw.contractDemandKva),
    rebate_incentive_inr: toNullableNumber(raw.rebate_incentive_inr ?? raw.rebateIncentiveInr),
    ccb_adjustment_inr: toNullableNumber(raw.ccb_adjustment_inr ?? raw.ccbAdjustmentInr),
    nfp_flag,
    strict_audit_mode: "strict_v1",
    strict_audit_notes,
    consumption_history,
    format_memory: format_memory || undefined,
    tariff_slabs_detected
  };
}
