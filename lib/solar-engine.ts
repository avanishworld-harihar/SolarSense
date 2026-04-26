import type { MonthlyUnits, SolarResult } from "@/lib/types";
import type { TariffContext } from "@/lib/tariff-types";
import {
  estimateMonthlyBillBreakdownWithContext,
  getFallbackTariffContext,
  monthlyBillTotalInr,
  stateSizingFactor
} from "@/lib/tariff-engine";

/** §8 / proposal: typical yield (kWh per kW per year) for recommended size. */
export const SOLAR_YIELD_KWH_PER_KW_YEAR = 1500;

const months: (keyof MonthlyUnits)[] = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Default when no context passed — MP §7 verified fallback (not generic). */
export const DEFAULT_TARIFF_CONTEXT: TariffContext = getFallbackTariffContext("Madhya Pradesh", "MPPKVVCL");

export function estimateMonthlyBillBreakdown(
  avgMonthlyUnits: number,
  ctx: TariffContext = DEFAULT_TARIFF_CONTEXT
): {
  energy: number;
  fixed: number;
  duty: number;
  fuel: number;
  total: number;
} {
  return estimateMonthlyBillBreakdownWithContext(avgMonthlyUnits, ctx);
}

function calcBillFromUnits(units: number, ctx: TariffContext): number {
  return monthlyBillTotalInr(units, ctx);
}

export type CalculateSolarOptions = {
  /** Installer / customer state for §8 sizing factor */
  stateForSizing?: string;
  /** Optional connected/sanctioned load for DISCOM fixed-charge math. */
  connectedLoadKw?: number;
  /** Optional area profile for DISCOM fixed-charge math. */
  areaProfile?: "urban" | "rural";
};

export function calculateSolar(
  monthlyUnits: MonthlyUnits,
  ctx: TariffContext = DEFAULT_TARIFF_CONTEXT,
  options?: CalculateSolarOptions
): SolarResult {
  const runtimeCtx: TariffContext =
    options?.connectedLoadKw != null || options?.areaProfile
      ? {
          ...ctx,
          connectedLoadKw: options.connectedLoadKw ?? ctx.connectedLoadKw,
          areaProfile: options.areaProfile ?? ctx.areaProfile
        }
      : ctx;
  const annualUnits = months.reduce((sum, key) => sum + (monthlyUnits[key] || 0), 0);
  const avgMonthlyUnits = annualUnits / 12;
  const monthlyBill = calcBillFromUnits(avgMonthlyUnits, runtimeCtx);

  const sizingMult = stateSizingFactor(options?.stateForSizing ?? "");
  const solarKw = Math.max(
    1,
    Math.round(((annualUnits * sizingMult) / SOLAR_YIELD_KWH_PER_KW_YEAR) * 10) / 10
  );
  const panels = Math.ceil((solarKw * 1000) / 540);
  const annualGeneration = Math.round(solarKw * SOLAR_YIELD_KWH_PER_KW_YEAR);

  const selfUse = Math.min(annualGeneration, annualUnits);
  const monthlySavings = Math.round((monthlyBill * (selfUse / Math.max(annualUnits, 1))) * 0.9);
  const annualSavings = monthlySavings * 12;

  const grossCost = Math.round(solarKw * 50000);
  const centralSubsidy =
    solarKw <= 2 ? Math.round(solarKw * 30000) : Math.min(78000, Math.round(60000 + (solarKw - 2) * 18000));
  const netCost = Math.max(0, grossCost - centralSubsidy);

  const paybackYears = annualSavings > 0 ? Number((netCost / annualSavings).toFixed(1)) : 0;
  const savings25yr = annualSavings * 25;
  const profit25yr = savings25yr - netCost;

  return {
    annualUnits,
    solarKw,
    panels,
    annualGeneration,
    currentMonthlyBill: monthlyBill,
    newMonthlyBill: Math.max(runtimeCtx.minBillInr, monthlyBill - monthlySavings),
    monthlySavings,
    annualSavings,
    grossCost,
    centralSubsidy,
    netCost,
    paybackYears,
    paybackDisplay: `${paybackYears} years`,
    savings25yr,
    profit25yr
  };
}
