import type { MonthlyUnits } from "@/lib/types";
import type { PremiumProposalPptInput } from "@/lib/proposal-ppt";

const MONTH_KEYS: (keyof MonthlyUnits)[] = [
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

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** True when proposal was built from uploaded bills and/or real monthly bill/units data. */
export function isProposalBillAuditBacked(input: PremiumProposalPptInput): boolean {
  if (input.dataSource === "bill") return true;
  if (input.dataSource === "requirement") return false;

  const actuals = input.monthlyBillActuals ?? {};
  if (MONTH_KEYS.some((k) => n(actuals[k]) > 0)) return true;

  const overrides = input.monthlyAuditOverrides ?? {};
  if (MONTH_KEYS.some((k) => overrides[k] != null)) return true;

  if (input.billMonth?.trim()) return true;
  if (n(input.currentMonthBillAmountInr) > 0) return true;
  if (n(input.referenceBillUnits) > 0) return true;
  if (n(input.billEnergyChargesInr) > 0) return true;
  if (n(input.billFixedChargeInr) > 0) return true;

  const units = MONTH_KEYS.map((k) => n(input.monthlyUnits[k]));
  const distinct = new Set(units);
  if (distinct.size > 1) return true;

  return false;
}

/** Builder-side: should we persist bill-audit pages on the public proposal? */
export function isBillBackedFromBuilderState(args: {
  latestBill: unknown | null;
  previousBill: unknown | null;
  additionalBills: (unknown | null)[];
  monthlyUnits: MonthlyUnits;
  auditedMonthTotals: Partial<Record<keyof MonthlyUnits, number>>;
  monthlyBillActuals: Partial<Record<keyof MonthlyUnits, number>>;
}): boolean {
  if (args.latestBill || args.previousBill || args.additionalBills.some(Boolean)) return true;
  if (MONTH_KEYS.some((k) => n(args.monthlyBillActuals[k]) > 0)) return true;
  if (Object.keys(args.auditedMonthTotals).length > 0) return true;
  const units = MONTH_KEYS.map((k) => n(args.monthlyUnits[k]));
  return new Set(units).size > 1;
}
