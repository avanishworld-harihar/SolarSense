/**
 * DG Hybrid Intelligence — savings, runtime, CO₂, and executive KPIs for commercial proposals.
 */

import type { DgAssumptions } from "@/lib/commercial-proposal-config";

export type DgFuelType = "diesel" | "natural_gas" | "dual_fuel";

export type DgHybridAnalysis = {
  enabled: boolean;
  capacityKva: number;
  fuelType: DgFuelType;
  runtimeHoursPerDay: number;
  peakLoadKw: number;
  criticalLoadKw: number;
  fuelConsumptionLph: number;
  dieselPricePerLitre: number;
  monthlyFuelCostBeforeInr: number;
  monthlyFuelCostAfterInr: number;
  monthlyFuelSavingsInr: number;
  annualFuelSavingsInr: number;
  annualRuntimeHoursBefore: number;
  annualRuntimeHoursAfter: number;
  runtimeReductionPct: number;
  annualLitresBefore: number;
  annualLitresAfter: number;
  co2TonnesSavedPerYear: number;
  solarOffsetPct: number;
  reliabilityScore: number;
};

const CO2_KG_PER_LITRE_DIESEL = 2.68;
const DEFAULT_DIESEL_PRICE = 95;

/** Normalize legacy + new DG fields into one shape. */
export function normalizeDgAssumptions(
  raw: DgAssumptions | undefined | null,
  systemKw: number
): Required<Pick<DgAssumptions, "enabled">> & DgAssumptions {
  const enabled = raw?.enabled === true;
  const runtime =
    raw?.runtimeHoursPerDay ?? raw?.hoursPerDay ?? defaultDgForSystem(systemKw).runtimeHoursPerDay;
  const monthlyFuel =
    raw?.monthlyFuelCostInr ?? defaultDgForSystem(systemKw).monthlyFuelCostInr ?? 0;
  return {
    enabled,
    capacityKva: raw?.capacityKva ?? defaultDgForSystem(systemKw).capacityKva,
    fuelType: raw?.fuelType ?? "diesel",
    runtimeHoursPerDay: runtime,
    hoursPerDay: runtime,
    operatingCostPerHourInr: raw?.operatingCostPerHourInr,
    fuelConsumptionLph: raw?.fuelConsumptionLph ?? defaultDgForSystem(systemKw).fuelConsumptionLph,
    monthlyFuelCostInr: monthlyFuel,
    peakLoadKw: raw?.peakLoadKw ?? defaultDgForSystem(systemKw).peakLoadKw,
    criticalLoadKw: raw?.criticalLoadKw ?? defaultDgForSystem(systemKw).criticalLoadKw,
    dieselPricePerLitre: raw?.dieselPricePerLitre ?? DEFAULT_DIESEL_PRICE,
    showArchitectureDiagram: raw?.showArchitectureDiagram !== false,
    showOperationScenarios: raw?.showOperationScenarios !== false,
  };
}

export function defaultDgForSystem(systemKw: number): DgAssumptions {
  const kw = Math.max(10, systemKw);
  const capacityKva = Math.round(kw * 1.25);
  const runtimeHoursPerDay = 4;
  const fuelConsumptionLph = Math.max(8, capacityKva * 0.22);
  return {
    enabled: false,
    capacityKva,
    fuelType: "diesel",
    runtimeHoursPerDay,
    hoursPerDay: runtimeHoursPerDay,
    fuelConsumptionLph,
    monthlyFuelCostInr: Math.round(runtimeHoursPerDay * 30 * fuelConsumptionLph * DEFAULT_DIESEL_PRICE * 0.85),
    peakLoadKw: Math.round(kw * 1.1),
    criticalLoadKw: Math.round(kw * 0.45),
    dieselPricePerLitre: DEFAULT_DIESEL_PRICE,
    showArchitectureDiagram: true,
    showOperationScenarios: true,
  };
}

/**
 * Solar reduces DG runtime proportionally to PV share of peak load (capped 75%).
 */
export function computeDgHybridAnalysis(
  dg: DgAssumptions | undefined | null,
  systemKw: number
): DgHybridAnalysis {
  const n = normalizeDgAssumptions(dg, systemKw);
  if (!n.enabled) {
    return {
      enabled: false,
      capacityKva: n.capacityKva ?? 0,
      fuelType: (n.fuelType as DgFuelType) ?? "diesel",
      runtimeHoursPerDay: 0,
      peakLoadKw: n.peakLoadKw ?? systemKw,
      criticalLoadKw: n.criticalLoadKw ?? 0,
      fuelConsumptionLph: 0,
      dieselPricePerLitre: n.dieselPricePerLitre ?? DEFAULT_DIESEL_PRICE,
      monthlyFuelCostBeforeInr: 0,
      monthlyFuelCostAfterInr: 0,
      monthlyFuelSavingsInr: 0,
      annualFuelSavingsInr: 0,
      annualRuntimeHoursBefore: 0,
      annualRuntimeHoursAfter: 0,
      runtimeReductionPct: 0,
      annualLitresBefore: 0,
      annualLitresAfter: 0,
      co2TonnesSavedPerYear: 0,
      solarOffsetPct: 0,
      reliabilityScore: 0,
    };
  }

  const peak = Math.max(systemKw, n.peakLoadKw ?? systemKw);
  const solarOffsetPct = Math.min(75, Math.round((systemKw / peak) * 55 + 15));
  const runtimeReductionPct = Math.min(80, Math.round(solarOffsetPct * 0.92));

  const hoursPerDay = Math.min(24, Math.max(0, n.runtimeHoursPerDay ?? 0));
  const annualBefore = hoursPerDay * 365;
  const annualAfter = Math.round(annualBefore * (1 - runtimeReductionPct / 100));

  const lph = Math.max(0, n.fuelConsumptionLph ?? 0);
  const annualLitresBefore = lph * annualBefore;
  const annualLitresAfter = lph * annualAfter;

  const dieselPrice = n.dieselPricePerLitre ?? DEFAULT_DIESEL_PRICE;
  const monthlyFromLitres = (litres: number) => Math.round((litres / 12) * dieselPrice);
  const monthlyFuelCostBeforeInr =
    n.monthlyFuelCostInr && n.monthlyFuelCostInr > 0
      ? n.monthlyFuelCostInr
      : monthlyFromLitres(annualLitresBefore);
  const monthlyFuelCostAfterInr = Math.round(
    monthlyFuelCostBeforeInr * (annualAfter / Math.max(1, annualBefore))
  );
  const monthlyFuelSavingsInr = Math.max(0, monthlyFuelCostBeforeInr - monthlyFuelCostAfterInr);
  const annualFuelSavingsInr = monthlyFuelSavingsInr * 12;

  const litresSaved = annualLitresBefore - annualLitresAfter;
  const co2TonnesSavedPerYear =
    n.fuelType === "natural_gas"
      ? Math.round((litresSaved * 1.9) / 1000 * 10) / 10
      : Math.round((litresSaved * CO2_KG_PER_LITRE_DIESEL) / 1000 * 10) / 10;

  const reliabilityScore = Math.min(
    99,
    72 + Math.round((n.criticalLoadKw ?? 0) / Math.max(1, peak) * 20) + Math.round(solarOffsetPct / 5)
  );

  return {
    enabled: true,
    capacityKva: n.capacityKva ?? Math.round(systemKw * 1.25),
    fuelType: (n.fuelType as DgFuelType) ?? "diesel",
    runtimeHoursPerDay: hoursPerDay,
    peakLoadKw: peak,
    criticalLoadKw: n.criticalLoadKw ?? Math.round(systemKw * 0.45),
    fuelConsumptionLph: lph,
    dieselPricePerLitre: dieselPrice,
    monthlyFuelCostBeforeInr,
    monthlyFuelCostAfterInr,
    monthlyFuelSavingsInr,
    annualFuelSavingsInr,
    annualRuntimeHoursBefore: annualBefore,
    annualRuntimeHoursAfter: annualAfter,
    runtimeReductionPct,
    annualLitresBefore,
    annualLitresAfter,
    co2TonnesSavedPerYear,
    solarOffsetPct,
    reliabilityScore,
  };
}
