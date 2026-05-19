/**
 * Commercial financing / EMI — wraps deck helpers for C&I proposals.
 */

import { buildEmiTable, computeEmi, type EmiRow } from "@/lib/proposal-deck-helpers";

export type CommercialFinancingConfig = {
  enabled?: boolean;
  interestRatePct?: number;
  tenuresYears?: number[];
  selectedTenureYears?: number;
  downPaymentInr?: number;
  lenderLabel?: string;
};

export const DEFAULT_COMMERCIAL_TENURES = [5, 7, 10] as const;
export const DEFAULT_COMMERCIAL_RATE_PCT = 9.5;

export function resolveFinancedPrincipal(netCostInr: number, downPaymentInr = 0): number {
  return Math.max(0, Math.round(netCostInr - Math.max(0, downPaymentInr)));
}

export function buildCommercialEmiTable(
  netCostInr: number,
  config: CommercialFinancingConfig | null | undefined
): EmiRow[] {
  const principal = resolveFinancedPrincipal(netCostInr, config?.downPaymentInr ?? 0);
  const rate = config?.interestRatePct ?? DEFAULT_COMMERCIAL_RATE_PCT;
  const tenures = config?.tenuresYears?.length
    ? config.tenuresYears
    : [...DEFAULT_COMMERCIAL_TENURES];
  return buildEmiTable(principal, rate, tenures);
}

export function selectedCommercialEmi(
  netCostInr: number,
  config: CommercialFinancingConfig | null | undefined
): EmiRow | null {
  const table = buildCommercialEmiTable(netCostInr, config);
  if (table.length === 0) return null;
  const selected = config?.selectedTenureYears;
  if (selected != null) {
    return table.find((r) => r.tenureYears === selected) ?? table[0];
  }
  return table[Math.floor(table.length / 2)] ?? table[0];
}

export { computeEmi, type EmiRow };
