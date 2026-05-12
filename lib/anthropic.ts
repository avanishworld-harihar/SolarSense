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
{"name":"","address":"","consumer_id":"","meter_number":"","connection_date":"","sanctioned_load":"","phase":"Single or Three","connection_type":"purpose as printed e.g. Shops/Showrooms or Domestic","purpose_of_supply":"","tariff_category":"exact tariff code e.g. LV2 [LV2.2]","contract_demand_kva":null,"discom":"","state":"","district":"","country":"India","bill_month":"","registered_mobile":"","fixed_charges_inr":null,"energy_charges_inr":null,"electricity_duty_inr":null,"regulatory_surcharges_inr":null,"total_amount_payable_inr":null,"read_type":"","bill_type_label":"","metered_unit_consumption":null,"total_amount_till_due_inr":null,"total_amount_after_due_inr":null,"current_month_bill_amount_inr":null,"principal_arrear_inr":null,"amount_received_against_bill_inr":null,"mp_govt_subsidy_amount_inr":null,"tod_rebate_inr":null,"fppas_inr":null,"pf_welding_surcharge_inr":null,"rebate_incentive_inr":null,"ccb_adjustment_inr":null,"nfp_flag":false,"strict_audit_mode":"strict_v1","strict_audit_notes":[],"months":{"jan":null,"feb":null,"mar":null,"apr":null,"may":null,"jun":null,"jul":null,"aug":null,"sep":null,"oct":null,"nov":null,"dec":null},"consumption_history":[],"format_memory":"","tariff_slabs_detected":[]}
${hintBlock}
======================================================================
INDIAN ELECTRICITY BILL STRUCTURE (read carefully before extracting):
======================================================================
• CURRENT MONTH section (top/header area): Bill Month, Billing Date, Metered Unit Consumption (= actual units consumed this month = Current Reading MINUS Previous Reading, a 2–3 digit number like 170 or 419), Current Reading (4–6 digit meter accumulator like 12847), Previous Reading (4–6 digit accumulator like 12406), Read Type, Bill Type. All charge lines (Fixed Charge, Energy Charges, FPPAS, Electricity Duty, Subsidy, Rebate, Arrear, CCB) also belong to current month.
• LAST SIX MONTHS CONSUMPTION table (lower section): Shows consumption history. It contains 5 recent previous months PLUS one "same month last year" entry (often shown in bold or listed first) as a year-on-year comparison reference. Example: if bill_month=APR-2026, this table shows APR-2025 (same month last year), NOV-2025, DEC-2025, JAN-2026, FEB-2026, MAR-2026. The APR-2025 row is historical context only.
• BILLING DETAILS / CHARGE BREAKDOWN: separate section with all INR line items.
• COLUMN GUARD — MP Poorv/Central/West layouts: NEVER copy **M.P. Govt. Subsidy Amount / subsidy rebate** ₹ amounts (decimals, e.g. −544.96) into metered_unit_consumption. Put them ONLY in mp_govt_subsidy_amount_inr as negative ₹. metered_unit_consumption = integer kWh for the bill month ONLY.
• CRITICAL — metered_unit_consumption vs meter reading: metered_unit_consumption is the NET UNITS consumed (Current Reading − Previous Reading = typically 100–600 units for domestic). Current Reading and Previous Reading are large accumulator values (4–6 digits, e.g. 12847). NEVER use a 4–6 digit accumulator value as metered_unit_consumption.

======================================================================
FIELD EXTRACTION RULES — CRITICAL for tariff engine downstream
======================================================================
The codified MPERC tariff list does the calculation; you MUST extract the
inputs so the rule engine can pick the right slab + sub-type. A wrong
sanctioned_load / tariff_category / purpose forces the engine into the
wrong sub-rule. Be precise — leave blank rather than guess.

──── (A) metered_unit_consumption (THIS MONTH's kWh) ────
• Net units = Current Reading − Previous Reading.
• Always a positive whole number, typically 1–9999.
• NEVER copy a 4–6 digit meter accumulator here.
• NEVER copy any ₹ value (decimals, negative signs) here.

──── (B) sanctioned_load (KW string verbatim) ────
• Label PREFERENCE order (use the first one you find printed):
    1. "Sanctioned Load"   2. "Authorised Load" / "Auth. Load"
    3. "S. Load"           4. "Connected Load"  (fallback only)
• Copy EXACTLY as printed WITH unit: "2.0 KW", "5.0 KW", "0.5 HP", "10 KW", "7.5 KW".
• Strip arbitrary surrounding text but keep the number + unit.
• Typical MP domestic single-phase: 1.0–2.0 KW; three-phase: 3.0–8.0 KW.
• Typical MP commercial: 1.0–10.0 KW (sanctioned-load tariff) or higher (demand-based).
• If the bill prints BOTH "Sanctioned Load" and "Connected Load" with different
  values, USE the "Sanctioned Load" line. Add a strict_audit_notes entry if so.
• DO NOT confuse with "Contract Demand" (that goes in contract_demand_kva).

──── (C) contract_demand_kva (number in kVA) ────
• Number-only (no units) — only when "Contract Demand", "CD", "Cont. Demand"
  is printed as a SEPARATE field with kVA unit.
• null if absent or zero — that means the consumer is on sanctioned-load tariff.
• NEVER copy sanctioned_load (KW) here.

──── (D) phase ────
• "Single" if bill prints "SINGLE", "1-Phase", "1 Ph", "1Φ", "1 PH".
• "Three" if bill prints "THREE", "3-Phase", "3 Ph", "3Φ", "3 PH".
• If sanctioned_load ≤ 2 KW with no explicit phase printed → "Single".

──── (E) tariff_category (EXACT printed code) ────
• Copy the EXACT printed tariff code, e.g. "LV-1.2", "LV2 [LV2.2]", "LV 2.1", "LV-5.1".
• Valid MPERC LT codes: LV-1.1, LV-1.2, LV-2.1, LV-2.2, LV-3, LV-4, LV-5.1, LV-5.2, LV-6.
• If no code is printed (only a label like "Domestic"), leave tariff_category empty —
  the back-end will map from purpose_of_supply.

──── (F) purpose_of_supply AND connection_type ────
• Copy the EXACT printed purpose into BOTH fields. Both must match.
• If only one purpose line is printed, duplicate it into both.
• Common MP purposes (and the LV they map to — for your self-check only;
  DO NOT paraphrase the printed text):
    - "Domestic" / "घरेलू" / "Light & Fan" / "Residential" → LV1.2
    - "BPL Lifeline" / "बीपीएल"                          → LV1.1
    - "Schools" / "Educational" / "College" / "Hostel"
      / "Working Women Hostel" / "Laboratory"            → LV2.1
    - "Shops" / "Showrooms" / "Office" / "Hospital"
      / "Restaurant" / "Hotel" / "Commercial"
      / "Non-Domestic" / "Godown"                        → LV2.2
    - "Public Water Works" / "PWW" / "Street Light"      → LV3
    - "LT Industrial" / "Manufacturing" / "Workshop"
      / "Industry"                                       → LV4
    - "Agriculture - Metered" / "Krishi - Metered"
      / "Pump - Metered"                                 → LV5.1
    - "Agriculture - Unmetered" / "Flat-rate Pump"       → LV5.2
    - "EV Charging" / "Battery Charging Station"         → LV6
• If purpose is illegible or absent, leave BOTH fields empty. DO NOT guess.

──── (G) bill_month (drives FY tariff + monthly FPPAS) ────
• Format as printed: "APR-2026", "Apr 2026", "April 2026" — but ALWAYS include the year.
• If only "April" is printed without a year, look elsewhere (billing date,
  reading date, due date) to disambiguate. Add a strict_audit_notes entry if
  the year is uncertain.

──── (H) discom + state + district ────
• Identify MP DISCOM from logo/header/address:
    - MPPaKVVCL (M.P. Paschim Kshetra / MPWZ-Indore zone)
    - MPMKVVCL (M.P. Madhya Kshetra / MPCZ-Bhopal zone)
    - MPPKVVCL (M.P. Poorv Kshetra / MPEZ-Jabalpur zone)
• If non-MP DISCOM, leave state blank or set as printed.

======================================================================
CHARGE LINE RULES
======================================================================
1) STRICT AUDIT: only use values explicitly printed; no assumptions.
2) Unknown text="", unknown numbers=null; uncertain/blurred → strict_audit_notes.
3) Never infer meter type from section labels (e.g. "Smart Meter RC/DC Amount Received" is not meter type).
4) Separate charge lines exactly: fixed_charges_inr, energy_charges_inr, electricity_duty_inr, fppas_inr, regulatory_surcharges_inr. Do NOT mix Time-of-Day (ToD) energy into flat energy lines — note in strict_audit_notes if ToD is present.
5) pf_welding_surcharge_inr: extract from "PF Surcharge" / "Welding Surcharge" /
   "Low PF Surcharge" lines (LV2.2 only; usually ₹0 except when power factor
   < threshold). null if no such line.
6) consumption_history: include EVERY row from the history table as {"month":"MMM-YYYY","units":number} — including the "same month last year" comparison row. Always include the year in month label (e.g. "APR-2025", "NOV-2025").
7) CRITICAL — months object (year-disambiguation): months keys jan–dec have NO year field, so follow these rules strictly:
    a) Current bill month key → ALWAYS set from metered_unit_consumption (round to integer). Example: bill_month="APR-2026" → months.apr = round(metered_unit_consumption). NEVER use the Last Six Months table for this key.
    b) Previous months → use data from the Last Six Months table, ONLY for months in the current billing year window (up to 11 months before bill_month). Example for APR-2026 bill: use NOV-2025, DEC-2025, JAN-2026, FEB-2026, MAR-2026 from the table. CRITICAL: map EACH row to its EXACT labelled month — DO NOT shift or swap month assignments. NOV-2025 row → months.nov. DEC-2025 row → months.dec. Never use the value from one month's row for a different month key.
    c) "Same month last year" row in history table → put in consumption_history ONLY. NEVER write it to months. Example for DEC-2025 bill: DEC-2024 row (bold/marked LY) goes ONLY into consumption_history, not into months.dec or any other months key.
    d) CONFUSION GUARD: In a DEC-2025 bill, the metered consumption is 194 units (for DEC). The history shows NOV-2025: 276. months.dec = 194 (current month), months.nov = 276 (from history). Do NOT accidentally assign 194 to months.nov — that is DEC's value, not NOV's.
8) tariff_slabs_detected: [] if slab table not visible.
9) Set nfp_flag=true only when "NFP" or "Not For Payment" text is explicitly present.
10) CRITICAL — mp_govt_subsidy_amount_inr: extract ONLY from the line whose label EXACTLY reads "M.P. Govt. Subsidy Amount" / "MP Govt Subsidy" / "Subsidy Amount" / "AGJY" / "Atal Griha Jyoti" / "Indira Griha Jyoti" / "Mukhyamantri … Subsidy". RULE BOOK: MP Govt. Domestic Subsidy is paid ONLY when monthly consumption ≤ 150 units. If metered_unit_consumption > 150 then this line is ALWAYS ₹0.00 → return 0 (never a negative value). Only ≤150-u bills print a NEGATIVE ₹ here (e.g. "-544.96", "-100.00", "( 100.00 )") — preserve the sign. NEVER source this value from any other negative row, especially NOT from "Other / TOD Rebate & Surcharge", "Rebate & Incentive", "Online / Advance Payment Incentive", "Lock Credit / Employee Rebate" or "Interest On Security Deposit". Return null only if the M.P. Govt. Subsidy row is entirely absent from the bill.
11) CRITICAL — tod_rebate_inr: extract ONLY from lines labelled "TOD" / "Time of Day" / "ToD Rebate & Surcharge" / "Other / TOD…". Signed ₹ as printed (rebate often negative; e.g. MAR-2026 −₹76.57, APR-2026 −₹100.00 on >150-u bills). NEVER put this amount into mp_govt_subsidy_amount_inr — TOD and Subsidy are independent fields.

======================================================================
SELF-AUDIT BEFORE RETURNING
======================================================================
Add to strict_audit_notes whenever ANY of these are true (so downstream
defaults / sub-rules can compensate):
  • "Sanctioned Load not printed"          (sanctioned_load empty)
  • "Tariff code not printed"              (tariff_category empty)
  • "Purpose / connection type not printed"
  • "Phase not printed"
  • "Bill month year ambiguous"            (no year on bill month)
  • "Both Sanctioned + Connected Load printed — used Sanctioned"
  • "Contract Demand present (demand-based sub-type)"
  • "ToD energy line present — flat-energy may include ToD components"
  • "Subsidy line not visible — units > 150 implies zero per MPERC rule"

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
