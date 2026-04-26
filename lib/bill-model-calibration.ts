import type { ParsedBillShape } from "@/lib/bill-parse";
import { estimateMonthlyBillBreakdownWithContext } from "@/lib/tariff-engine";
import { loadTariffContextFromSupabase } from "@/lib/supabase-tariff";
import type { TariffContext } from "@/lib/tariff-types";

type UnitsPick = { units: number; source: "bill_month" | "consumption_history" | "months_average" } | null;

export type BillModelCalibrationResult = {
  checked: boolean;
  shouldQueue: boolean;
  reason:
    | "ok"
    | "missing_state_or_discom"
    | "missing_bill_amount"
    | "missing_units"
    | "low_mismatch"
    | "high_mismatch";
  state: string;
  discom: string;
  unitsUsed: number;
  unitsSource: UnitsPick["source"] | null;
  actualBillInr: number;
  modeledBillInr: number;
  absoluteDeltaInr: number;
  errorPercent: number;
  actualPerUnit: number;
  modeledPerUnit: number;
  suggestion: {
    energyRateMultiplier: number;
    fixedChargeDeltaInr: number;
    fuelPerKwhDelta: number;
    dutyRateDeltaPctPoint: number;
  };
};

const MONTH_MAP: Record<string, keyof NonNullable<ParsedBillShape["months"]>> = {
  jan: "jan",
  january: "jan",
  feb: "feb",
  february: "feb",
  mar: "mar",
  march: "mar",
  apr: "apr",
  april: "apr",
  may: "may",
  jun: "jun",
  june: "jun",
  jul: "jul",
  july: "jul",
  aug: "aug",
  august: "aug",
  sep: "sep",
  sept: "sep",
  september: "sep",
  oct: "oct",
  october: "oct",
  nov: "nov",
  november: "nov",
  dec: "dec",
  december: "dec"
};

function num(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const parsed = parseFloat(String(raw ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parseMonthKey(raw: string): keyof NonNullable<ParsedBillShape["months"]> | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  const match = text.match(/[a-z]+/g);
  if (!match?.length) return null;
  for (const token of match) {
    const key = MONTH_MAP[token];
    if (key) return key;
  }
  return null;
}

function pickUnitsForCalibration(parsed: ParsedBillShape): UnitsPick {
  const billMonthKey = parseMonthKey(parsed.bill_month ?? "");
  if (billMonthKey && parsed.months?.[billMonthKey] != null) {
    const v = Math.round(num(parsed.months[billMonthKey]));
    if (Number.isFinite(v) && v > 0) return { units: v, source: "bill_month" };
  }

  const hist = parsed.consumption_history ?? [];
  if (hist.length > 0) {
    const first = Math.round(num(hist[0]?.units));
    if (Number.isFinite(first) && first > 0) return { units: first, source: "consumption_history" };
  }

  const monthValues = Object.values(parsed.months ?? {})
    .map((v) => Math.round(num(v)))
    .filter((v) => Number.isFinite(v) && v > 0);
  if (monthValues.length > 0) {
    const avg = Math.round(monthValues.reduce((sum, v) => sum + v, 0) / monthValues.length);
    if (avg > 0) return { units: avg, source: "months_average" };
  }

  return null;
}

function buildSuggestion(actualBillInr: number, modeledBillInr: number, unitsUsed: number, ctx: TariffContext) {
  const ratio = modeledBillInr > 0 ? actualBillInr / modeledBillInr : 1;
  const fixedChargeDeltaInr = Math.round((actualBillInr - modeledBillInr) * 0.2);
  const fuelPerKwhDelta = Math.round((((actualBillInr - modeledBillInr) / Math.max(unitsUsed, 1)) * 0.25) * 1000) / 1000;
  const dutyRateDeltaPctPoint = Math.round(clamp((ratio - 1) * 100 * 0.15, -5, 5) * 100) / 100;
  return {
    energyRateMultiplier: Math.round(clamp(ratio, 0.75, 1.35) * 1000) / 1000,
    fixedChargeDeltaInr,
    fuelPerKwhDelta,
    dutyRateDeltaPctPoint: ctx.dutyMode === "none" ? 0 : dutyRateDeltaPctPoint
  };
}

export async function evaluateBillModelCalibration(parsed: ParsedBillShape): Promise<BillModelCalibrationResult> {
  const state = parsed.state?.trim() ?? "";
  const discom = parsed.discom?.trim() ?? "";
  if (!state || !discom) {
    return {
      checked: false,
      shouldQueue: false,
      reason: "missing_state_or_discom",
      state,
      discom,
      unitsUsed: 0,
      unitsSource: null,
      actualBillInr: 0,
      modeledBillInr: 0,
      absoluteDeltaInr: 0,
      errorPercent: 0,
      actualPerUnit: 0,
      modeledPerUnit: 0,
      suggestion: { energyRateMultiplier: 1, fixedChargeDeltaInr: 0, fuelPerKwhDelta: 0, dutyRateDeltaPctPoint: 0 }
    };
  }

  const currentMonthBillInr = Math.round(num(parsed.current_month_bill_amount_inr));
  const totalPayableInr = Math.round(num(parsed.total_amount_payable_inr));
  const totalTillDueInr = Math.round(num(parsed.total_amount_till_due_inr));
  const actualBillInr =
    Number.isFinite(currentMonthBillInr) && currentMonthBillInr > 0
      ? currentMonthBillInr
      : Number.isFinite(totalPayableInr) && totalPayableInr > 0
        ? totalPayableInr
        : totalTillDueInr;
  if (!Number.isFinite(actualBillInr) || actualBillInr <= 0) {
    return {
      checked: false,
      shouldQueue: false,
      reason: "missing_bill_amount",
      state,
      discom,
      unitsUsed: 0,
      unitsSource: null,
      actualBillInr: 0,
      modeledBillInr: 0,
      absoluteDeltaInr: 0,
      errorPercent: 0,
      actualPerUnit: 0,
      modeledPerUnit: 0,
      suggestion: { energyRateMultiplier: 1, fixedChargeDeltaInr: 0, fuelPerKwhDelta: 0, dutyRateDeltaPctPoint: 0 }
    };
  }

  const unitsPick = pickUnitsForCalibration(parsed);
  if (!unitsPick) {
    return {
      checked: false,
      shouldQueue: false,
      reason: "missing_units",
      state,
      discom,
      unitsUsed: 0,
      unitsSource: null,
      actualBillInr,
      modeledBillInr: 0,
      absoluteDeltaInr: 0,
      errorPercent: 0,
      actualPerUnit: 0,
      modeledPerUnit: 0,
      suggestion: { energyRateMultiplier: 1, fixedChargeDeltaInr: 0, fuelPerKwhDelta: 0, dutyRateDeltaPctPoint: 0 }
    };
  }

  const ctx = await loadTariffContextFromSupabase(state, discom);
  const model = estimateMonthlyBillBreakdownWithContext(unitsPick.units, ctx);
  const modeledBillInr = model.total;
  const absoluteDeltaInr = Math.round(actualBillInr - modeledBillInr);
  const errorPercent = Math.round(((absoluteDeltaInr / Math.max(actualBillInr, 1)) * 100) * 100) / 100;
  const absError = Math.abs(errorPercent);
  const shouldQueue = actualBillInr >= 300 && absError >= 12;
  const reason = shouldQueue ? "high_mismatch" : "low_mismatch";
  const actualPerUnit = Math.round((actualBillInr / Math.max(unitsPick.units, 1)) * 1000) / 1000;
  const modeledPerUnit = Math.round((modeledBillInr / Math.max(unitsPick.units, 1)) * 1000) / 1000;

  return {
    checked: true,
    shouldQueue,
    reason,
    state,
    discom,
    unitsUsed: unitsPick.units,
    unitsSource: unitsPick.source,
    actualBillInr,
    modeledBillInr,
    absoluteDeltaInr,
    errorPercent,
    actualPerUnit,
    modeledPerUnit,
    suggestion: buildSuggestion(actualBillInr, modeledBillInr, unitsPick.units, ctx)
  };
}
