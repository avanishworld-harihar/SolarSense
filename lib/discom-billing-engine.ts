import { estimateMonthlyBillBreakdownWithContext } from "@/lib/tariff-engine";
import type { TariffContext } from "@/lib/tariff-types";

export type BillInputSnapshot = {
  latestMonthlyBillInr?: number;
  sixMonthsAgoBillInr?: number;
  yearlyAverageBillInr?: number;
};

export type BillingComputationMode = "latest_only" | "latest_plus_6m_average" | "yearly_average";

export type BillingComputationRequest = {
  mode: BillingComputationMode;
  averageMonthlyUnits: number;
  tariffContext: TariffContext;
  inputSnapshot?: BillInputSnapshot;
};

export type BillingComputationResult = {
  modeledBillInr: number;
  breakdown: { energy: number; fixed: number; duty: number; fuel: number; total: number };
  notes: string[];
};

/**
 * Placeholder engine for DISCOM-specific billing math in SOL.52.
 * Current stage: modeled bill from tariff context + mode-specific notes/hooks.
 */
export function computeBillingEstimate(req: BillingComputationRequest): BillingComputationResult {
  const breakdown = estimateMonthlyBillBreakdownWithContext(req.averageMonthlyUnits, req.tariffContext);
  const notes: string[] = [];

  if (req.mode === "latest_plus_6m_average") {
    notes.push("SOL.52 rule: using latest + 6-month bill profile for seasonal normalization (placeholder hook).");
    if (req.inputSnapshot?.latestMonthlyBillInr && req.inputSnapshot?.sixMonthsAgoBillInr) {
      notes.push(
        `User-provided pair: ₹${req.inputSnapshot.latestMonthlyBillInr} and ₹${req.inputSnapshot.sixMonthsAgoBillInr}.`
      );
    }
  } else if (req.mode === "yearly_average") {
    notes.push("SOL.52 rule: yearly average billing profile selected (placeholder hook).");
  } else {
    notes.push("SOL.52 rule: latest-bill baseline mode.");
  }

  return {
    modeledBillInr: breakdown.total,
    breakdown,
    notes
  };
}

