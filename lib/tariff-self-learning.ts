import type { ParsedBillShape } from "@/lib/bill-parse";
import { loadTariffContextFromSupabase } from "@/lib/supabase-tariff";

export type TariffComparisonResult = {
  checked: boolean;
  mismatch: boolean;
  activeTariff: string;
  detectedRates: number[];
  databaseRates: number[];
  reason: string;
};

function uniqSorted(values: number[]): number[] {
  return [...new Set(values.map((v) => Math.round(v * 1000) / 1000))].sort((a, b) => a - b);
}

function normalizeDetectedRates(parsed: ParsedBillShape): number[] {
  const rows = parsed.tariff_slabs_detected ?? [];
  return uniqSorted(
    rows
      .map((r) => {
        const n = Number(r.rate_per_unit);
        return Number.isFinite(n) && n > 0 ? n : NaN;
      })
      .filter((n) => Number.isFinite(n))
  );
}

function normalizeDbRates(energySlabs: { rate: number }[]): number[] {
  return uniqSorted(energySlabs.map((s) => Number(s.rate)).filter((n) => Number.isFinite(n) && n > 0));
}

function hasRateMismatch(detected: number[], database: number[], tolerance = 0.06): boolean {
  if (detected.length === 0) return false;
  if (database.length === 0) return true;
  const unmatchedDetected = detected.filter((d) => !database.some((db) => Math.abs(db - d) <= tolerance));
  return unmatchedDetected.length > 0;
}

export async function compareBillRatesWithDatabase(parsed: ParsedBillShape): Promise<TariffComparisonResult> {
  const state = parsed.state?.trim() || "";
  const discom = parsed.discom?.trim() || "";
  const detectedRates = normalizeDetectedRates(parsed);
  if (!state || !discom || detectedRates.length === 0) {
    return {
      checked: false,
      mismatch: false,
      activeTariff: discom || "Unknown DISCOM",
      detectedRates,
      databaseRates: [],
      reason: !discom ? "missing_discom" : detectedRates.length === 0 ? "no_detected_slabs" : "missing_state"
    };
  }

  const dbCtx = await loadTariffContextFromSupabase(state, discom);
  const databaseRates = normalizeDbRates(dbCtx.energySlabs);
  const mismatch = hasRateMismatch(detectedRates, databaseRates);

  return {
    checked: true,
    mismatch,
    activeTariff: dbCtx.discomLabel || discom,
    detectedRates,
    databaseRates,
    reason: mismatch ? "rate_mismatch" : "aligned"
  };
}
