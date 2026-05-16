import { calculateSolar } from "@/lib/solar-engine";
import type { MonthlyUnits } from "@/lib/types";
import type { TariffContext } from "@/lib/tariff-types";
import { estimateMonthlyKwhFromBillAmount } from "@/lib/tariff-engine";
import { loadTariffContextFromSupabase } from "@/lib/supabase-tariff";
import { platformBrandBlock, type PlatformBrandBlock } from "@/lib/platform-branding";

/** Bump when homeowner output shape or math assumptions change (acquisition clients may cache). */
export const PUBLIC_SOLAR_ENGINE_VERSION = "1.0.0";

export const PUBLIC_SOLAR_ENGINE_SCHEME = "homeowner_uniform_monthly" as const;

/** Standard copy for acquisition UIs; keep API-returned disclaimers in sync with product/legal. */
export const PUBLIC_SOLAR_DISCLAIMERS = [
  "Indicative estimate only — not a quote, sanction, or net-metering guarantee.",
  "Assumes the same electricity consumption every month of the year.",
  "Tariffs, duties, subsidies, and DISCOM rules change; verify with your DISCOM and a site survey.",
  "Savings depend on self-consumption, export policy, shading, and system quality."
] as const;

export type HomeownerConsumptionBasis = "average_monthly_kwh" | "annual_kwh" | "inferred_from_average_monthly_bill";

export type HomeownerSolarEstimateInput = {
  /** Indian state / UT name (matched like `/api/tariff-context`). */
  state: string;
  /** DISCOM code or name; strongly recommended — improves DB tariff match. */
  discom?: string;
  /** Optional `YYYY-MM` for FY-sensitive fallbacks (e.g. MP). */
  billMonth?: string;
  /** MP-style domestic fixed model when DISCOM uses `mp_tiered`. */
  areaProfile?: "urban" | "rural";
  /** Exactly one consumption signal should be set (see `resolveAverageMonthlyKwh`). */
  averageMonthlyKwh?: number | null;
  annualConsumptionKwh?: number | null;
  averageMonthlyBillInr?: number | null;
};

export type HomeownerSolarEstimateOutput = {
  ok: true;
  engineVersion: string;
  scheme: typeof PUBLIC_SOLAR_ENGINE_SCHEME;
  tariff: {
    discomLabel: string;
    source: string;
    billMonth?: string;
  };
  inputs: {
    state: string;
    discom?: string;
    averageMonthlyKwh: number;
    consumptionBasis: HomeownerConsumptionBasis;
    /** Present when user supplied bill-based input. */
    statedAverageMonthlyBillInr?: number;
  };
  estimates: {
    recommendedSystemKw: number;
    estimatedPanelCount: number;
    estimatedAnnualGenerationKwh: number;
    estimatedMonthlySavingsInr: number;
    estimatedAnnualSavingsInr: number;
    estimatedPaybackYears: number;
    grossSystemCostInr: number;
    centralSubsidyInr: number;
    netSystemCostAfterSubsidyInr: number;
    estimatedTwentyFiveYearSavingsInr: number;
    /** Net savings vs net system cost over 25 years (model). */
    estimatedTwentyFiveYearProfitInr: number;
    modelCurrentMonthlyBillInr: number;
    modelNewMonthlyBillInr: number;
  };
  disclaimers: readonly string[];
  warnings: string[];
  /** Canonical platform attribution for acquisition UIs and external brand clients. */
  branding: PlatformBrandBlock;
};

function uniformMonthlyUnits(avgKwhPerMonth: number): MonthlyUnits {
  const v = Math.max(0, Number(avgKwhPerMonth) || 0);
  return {
    jan: v,
    feb: v,
    mar: v,
    apr: v,
    may: v,
    jun: v,
    jul: v,
    aug: v,
    sep: v,
    oct: v,
    nov: v,
    dec: v
  };
}

export type ResolveConsumptionResult =
  | { ok: true; averageMonthlyKwh: number; basis: HomeownerConsumptionBasis; statedBillInr?: number }
  | { ok: false; error: string };

/**
 * Validates that exactly one homeowner-friendly consumption input is provided
 * and returns average monthly kWh (for uniform 12-month spread).
 */
export function resolveAverageMonthlyKwh(
  input: Pick<
    HomeownerSolarEstimateInput,
    "averageMonthlyKwh" | "annualConsumptionKwh" | "averageMonthlyBillInr"
  >,
  tariffCtx: TariffContext
): ResolveConsumptionResult {
  const hasKwh = input.averageMonthlyKwh != null && Number.isFinite(Number(input.averageMonthlyKwh));
  const hasAnnual = input.annualConsumptionKwh != null && Number.isFinite(Number(input.annualConsumptionKwh));
  const hasBill = input.averageMonthlyBillInr != null && Number.isFinite(Number(input.averageMonthlyBillInr));
  const n = [hasKwh, hasAnnual, hasBill].filter(Boolean).length;
  if (n === 0) {
    return { ok: false, error: "Provide exactly one of: averageMonthlyKwh, annualConsumptionKwh, or averageMonthlyBillInr" };
  }
  if (n > 1) {
    return { ok: false, error: "Provide only one of: averageMonthlyKwh, annualConsumptionKwh, or averageMonthlyBillInr" };
  }
  if (hasAnnual) {
    const annual = Number(input.annualConsumptionKwh);
    if (annual <= 0) return { ok: false, error: "annualConsumptionKwh must be positive" };
    return { ok: true, averageMonthlyKwh: annual / 12, basis: "annual_kwh" };
  }
  if (hasKwh) {
    const m = Number(input.averageMonthlyKwh);
    if (m <= 0) return { ok: false, error: "averageMonthlyKwh must be positive" };
    return { ok: true, averageMonthlyKwh: m, basis: "average_monthly_kwh" };
  }
  const bill = Number(input.averageMonthlyBillInr);
  if (bill <= 0) return { ok: false, error: "averageMonthlyBillInr must be positive" };
  const inferred = estimateMonthlyKwhFromBillAmount(bill, tariffCtx);
  if (inferred <= 0) {
    return { ok: false, error: "Could not infer consumption from bill for this tariff context" };
  }
  return { ok: true, averageMonthlyKwh: inferred, basis: "inferred_from_average_monthly_bill", statedBillInr: bill };
}

function applyBillMonthToCtx(ctx: TariffContext, billMonth?: string): TariffContext {
  if (!billMonth?.trim()) return ctx;
  return { ...ctx, billMonth: billMonth.trim() };
}

/**
 * Loads DISCOM tariff context then runs the **same** `calculateSolar` path as the installer product,
 * with **uniform** monthly kWh (homeowner-simple consumption model).
 */
export async function estimateHomeownerSolar(input: HomeownerSolarEstimateInput): Promise<HomeownerSolarEstimateOutput> {
  const state = input.state.trim();
  const discomHint = (input.discom ?? "").trim();
  const rawCtx = await loadTariffContextFromSupabase(state, discomHint || "MPPKVVCL");
  const ctx = applyBillMonthToCtx(rawCtx, input.billMonth);

  const resolved = resolveAverageMonthlyKwh(input, ctx);
  if (!resolved.ok) {
    throw new Error(resolved.error);
  }

  const warnings: string[] = [];
  if (!discomHint) {
    warnings.push(
      "No discom provided — tariff match may be generic. Pass discom (code or name) for more accurate bills and savings."
    );
  }

  const monthlyUnits = uniformMonthlyUnits(resolved.averageMonthlyKwh);
  const engine = calculateSolar(monthlyUnits, ctx, {
    stateForSizing: state,
    discom: discomHint || undefined,
    billMonth: input.billMonth?.trim(),
    areaProfile: input.areaProfile
  });

  return {
    ok: true,
    engineVersion: PUBLIC_SOLAR_ENGINE_VERSION,
    scheme: PUBLIC_SOLAR_ENGINE_SCHEME,
    tariff: {
      discomLabel: ctx.discomLabel,
      source: ctx.source,
      billMonth: ctx.billMonth
    },
    inputs: {
      state,
      discom: discomHint || undefined,
      averageMonthlyKwh: Math.round(resolved.averageMonthlyKwh * 100) / 100,
      consumptionBasis: resolved.basis,
      statedAverageMonthlyBillInr:
        resolved.basis === "inferred_from_average_monthly_bill" ? resolved.statedBillInr : undefined
    },
    estimates: {
      recommendedSystemKw: engine.solarKw,
      estimatedPanelCount: engine.panels,
      estimatedAnnualGenerationKwh: engine.annualGeneration,
      estimatedMonthlySavingsInr: engine.monthlySavings,
      estimatedAnnualSavingsInr: engine.annualSavings,
      estimatedPaybackYears: engine.paybackYears,
      grossSystemCostInr: engine.grossCost,
      centralSubsidyInr: engine.centralSubsidy,
      netSystemCostAfterSubsidyInr: engine.netCost,
      estimatedTwentyFiveYearSavingsInr: engine.savings25yr,
      estimatedTwentyFiveYearProfitInr: engine.profit25yr,
      modelCurrentMonthlyBillInr: engine.currentMonthlyBill,
      modelNewMonthlyBillInr: engine.newMonthlyBill
    },
    disclaimers: PUBLIC_SOLAR_DISCLAIMERS,
    warnings,
    branding: platformBrandBlock("public_api")
  };
}
