import type { MonthKey, MonthlyUnits } from "@/lib/types";

const MONTH_KEYS: MonthKey[] = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec"
];

export function emptyMonthlyUnits(): MonthlyUnits {
  return MONTH_KEYS.reduce((acc, k) => {
    acc[k] = 0;
    return acc;
  }, {} as MonthlyUnits);
}

export interface ParsedBillShape {
  name?: string;
  address?: string;
  consumer_id?: string;
  meter_number?: string;
  connection_date?: string;
  sanctioned_load?: string;
  phase?: string;
  /** Registered mobile number printed on the bill (10-digit Indian number or as printed). */
  registered_mobile?: string;
  connection_type?: string;
  /** e.g. Domestic / Commercial / LT / HT — as printed on bill */
  tariff_category?: string;
  discom?: string;
  state?: string;
  district?: string;
  country?: string;
  bill_month?: string;
  months?: Partial<Record<MonthKey, number | string | null>>;
  /** Demand / fixed / meter rent — INR from bill (Gemini). */
  fixed_charges_inr?: number | string | null;
  /** Energy or consumption charges — INR (Gemini). */
  energy_charges_inr?: number | string | null;
  /** Total payable / current bill amount — INR (Gemini). */
  total_amount_payable_inr?: number | string | null;
  /** Bill section fields for strict evidence-only audit mode. */
  read_type?: string;
  bill_type_label?: string;
  metered_unit_consumption?: number | string | null;
  total_amount_till_due_inr?: number | string | null;
  total_amount_after_due_inr?: number | string | null;
  current_month_bill_amount_inr?: number | string | null;
  principal_arrear_inr?: number | string | null;
  amount_received_against_bill_inr?: number | string | null;
  mp_govt_subsidy_amount_inr?: number | string | null;
  fppas_inr?: number | string | null;
  rebate_incentive_inr?: number | string | null;
  ccb_adjustment_inr?: number | string | null;
  nfp_flag?: boolean;
  /** Only values explicitly printed on the bill; no assumptions. */
  strict_audit_mode?: "strict_v1";
  /** Keep short notes for unresolved/unclear OCR regions. */
  strict_audit_notes?: string[];
  /**
   * Raw rows from the bill’s consumption history table / graph (month label as printed).
   * Filled alongside `months` for §4.3 twelve-month workflow.
   */
  consumption_history?: ConsumptionHistoryRow[];
  /**
   * One sentence (English): where history appears on this DISCOM layout — saved to `discom_formats` for next scan.
   */
  format_memory?: string;
  /** Optional AI-extracted slab rates from bill tariff section for self-learning checks. */
  tariff_slabs_detected?: TariffSlabDetected[];
}

export type ConsumptionHistoryRow = { month: string; units: number };
export type TariffSlabDetected = {
  from_unit?: number | null;
  to_unit?: number | null;
  rate_per_unit: number;
  unit_label?: string;
};

export function mergeParsedMonthsIntoUnits(base: MonthlyUnits, months: ParsedBillShape["months"]): MonthlyUnits {
  const next = { ...base };
  if (!months) return next;
  for (const key of MONTH_KEYS) {
    const raw = months[key];
    if (raw == null) continue;
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      next[key] = Math.round(raw);
      continue;
    }
    if (typeof raw === "string") {
      const n = parseInt(raw.replace(/[^\d]/g, ""), 10);
      if (!Number.isNaN(n) && n > 0) next[key] = n;
    }
  }
  return next;
}

export function countFilledMonths(units: MonthlyUnits): number {
  return MONTH_KEYS.filter((k) => (units[k] || 0) > 0).length;
}

export function extractJsonFromModelText(text: string): unknown {
  const stripped = String(text)
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw new Error("Could not parse JSON from model response");
  }
}
