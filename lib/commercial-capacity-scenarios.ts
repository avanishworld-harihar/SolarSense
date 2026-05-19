/**
 * Plant capacity scenario comparison — executive multi-kW options.
 */

import type { ProposalDeckSummary } from "@/lib/proposal-ppt";

export type CapacityScenarioInput = {
  id: string;
  label: string;
  systemKw: number;
  isRecommended?: boolean;
};

export type CapacityScenarioMetrics = CapacityScenarioInput & {
  grossCostInr: number;
  netCostInr: number;
  annualGenKwh: number;
  annualSavingInr: number;
  paybackYears: number;
  moduleCountApprox: number;
  roofAreaSqmApprox: number;
};

const MODULE_WATT_DEFAULT = 540;
const SQM_PER_KW = 6.5;

/**
 * Scales deck summary metrics proportionally by kW ratio (requirement-path estimates).
 */
export function computeCapacityScenarioMetrics(
  base: ProposalDeckSummary,
  scenario: CapacityScenarioInput,
  moduleWatt = MODULE_WATT_DEFAULT
): CapacityScenarioMetrics {
  const ratio = base.systemKw > 0 ? scenario.systemKw / base.systemKw : 1;
  const grossCostInr = Math.round(base.grossSystemCost * ratio);
  const netCostInr = Math.round(base.netCost * ratio);
  const annualGenKwh = Math.round(base.annualGen * ratio);
  const annualSavingInr = Math.round(base.annualSaving * ratio);
  const paybackYears =
    annualSavingInr > 0 && netCostInr > 0 ? Math.round((netCostInr / annualSavingInr) * 10) / 10 : base.paybackYears;

  const moduleCountApprox = Math.max(1, Math.ceil((scenario.systemKw * 1000) / moduleWatt));
  const roofAreaSqmApprox = Math.round(scenario.systemKw * SQM_PER_KW);

  return {
    ...scenario,
    grossCostInr,
    netCostInr,
    annualGenKwh,
    annualSavingInr,
    paybackYears,
    moduleCountApprox,
    roofAreaSqmApprox,
  };
}

export function buildDefaultScenarios(primaryKw: number): CapacityScenarioInput[] {
  const step = Math.max(5, Math.round(primaryKw * 0.15 / 5) * 5);
  const lower = Math.max(10, primaryKw - step);
  const higher = primaryKw + step;

  return [
    { id: "primary", label: "Recommended", systemKw: primaryKw, isRecommended: true },
    { id: "option_a", label: "Conservative", systemKw: lower },
    { id: "option_b", label: "Expansion", systemKw: higher },
  ];
}

export function resolveScenarioMetrics(
  base: ProposalDeckSummary,
  scenarios: CapacityScenarioInput[],
  moduleWatt?: number
): CapacityScenarioMetrics[] {
  return scenarios.map((s) => computeCapacityScenarioMetrics(base, s, moduleWatt));
}
