/**
 * Sol.52 — PPT month-wise audit rows powered by the FY 2025-26 MP engine.
 *
 * Replaces the old `estimateMonthlyBillBreakdownWithContext` based row builder
 * for MP customers. The output shape (AuditRow[]) is identical so the slide-
 * rendering code in `lib/proposal-ppt.ts` does not need to change.
 *
 * Hierarchy of truth (highest first):
 *   1. `monthlyAuditOverrides` — values pulled from `mp_bill_audits` table
 *      (real audited bills already validated against printed amounts).
 *   2. `monthlyBillActuals` — actuals provided directly by the proposal flow.
 *   3. Engine output from `calculateMpBill` using FY 2025-26 tariff data.
 *
 * Net effect: any month for which we have a saved audit row in Supabase is
 * shown EXACTLY as the audit calculated it. Other months are recomputed
 * deterministically (no two-point linear extrapolation hacks).
 */

import { calculateMpBill } from "@/lib/mp-bill-engine";
import {
  detectMpDiscomFromAddress,
  normalizeTariffCategory,
  resolveMpDiscomFromHint,
  type MpAreaProfile,
  type MpDiscomCode,
  type MpTariffCategory
} from "@/lib/mp-tariff-2025-26";
import type { MonthlyUnits } from "@/lib/types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const MONTH_KEYS: (keyof MonthlyUnits)[] = [
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"
];

export type PptAuditRow = {
  label: string;
  units: number;
  energy: number;
  fixed: number;
  duty: number;
  fuel: number;
  total: number;
  /** Provenance of the row total — useful for QA tooltips later. */
  source: "mp_audit_db" | "mp_engine_2025_26" | "actual_input" | "no_consumption";
};

export type MpMonthlyAuditOverride = {
  /** ₹ printed/audited net payable for this month. */
  netPayableInr: number;
  energyInr?: number;
  fixedInr?: number;
  fppasInr?: number;
  electricityDutyInr?: number;
  units?: number;
};

export type MpPptRowsInput = {
  state?: string;
  discom?: string;
  tariffCategory?: string;
  connectionType?: string;
  connectedLoadKw?: number;
  areaProfile?: MpAreaProfile;
  contractDemandKva?: number;
  monthlyUnits: MonthlyUnits;
  /** Direct input from proposal flow (legacy). */
  monthlyBillActuals?: Partial<Record<keyof MonthlyUnits, number>>;
  /** Audited rows from Supabase `mp_bill_audits` keyed by month. */
  monthlyAuditOverrides?: Partial<Record<keyof MonthlyUnits, MpMonthlyAuditOverride>>;
  /** Optional FPPAS overrides per month (e.g. -0.0223 for Nov). */
  monthlyFppasPct?: Partial<Record<keyof MonthlyUnits, number>>;
  /** Whether the consumer typically claims AGJY (LV-1.2 only). */
  agjyClaimed?: boolean;
};

const n = (v: number) => Math.max(0, Math.round(Number(v) || 0));

function detectMpDiscom(input: MpPptRowsInput): MpDiscomCode | null {
  const fromHint = resolveMpDiscomFromHint(input.discom ?? "");
  if (fromHint) return fromHint.code;
  const fromState = resolveMpDiscomFromHint(input.state ?? "");
  if (fromState) return fromState.code;
  const fromAddr = detectMpDiscomFromAddress(input.state ?? "");
  if (fromAddr) return fromAddr.code;
  return null;
}

function detectMpCategory(input: MpPptRowsInput): MpTariffCategory {
  return (
    normalizeTariffCategory(input.tariffCategory) ||
    normalizeTariffCategory(input.connectionType) ||
    "LV1.2"
  );
}

export function isMpProposalContext(input: { state?: string; discom?: string }): boolean {
  return Boolean(detectMpDiscom({ state: input.state, discom: input.discom, monthlyUnits: {} as MonthlyUnits }));
}

/**
 * Build 12 monthly audit rows using the new FY 2025-26 MP tariff engine,
 * preferring already-audited Supabase rows for months that have them.
 */
export function buildMpAuditRows(input: MpPptRowsInput): {
  rows: PptAuditRow[];
  totals: PptAuditRow;
  summerPct: number;
  fixedAnnual: number;
  discomCode: MpDiscomCode;
  category: MpTariffCategory;
} {
  const discomCode = detectMpDiscom(input) ?? "MPMKVVCL";
  const category = detectMpCategory(input);
  const area: MpAreaProfile = input.areaProfile ?? "urban";

  const rows: PptAuditRow[] = MONTH_LABELS.map((label, i) => {
    const monthKey = MONTH_KEYS[i];
    const units = n(input.monthlyUnits[monthKey]);

    // 1. Prefer audited Supabase override.
    const dbAudit = input.monthlyAuditOverrides?.[monthKey];
    if (dbAudit && Number.isFinite(dbAudit.netPayableInr) && dbAudit.netPayableInr > 0) {
      return {
        label,
        units: n(dbAudit.units ?? units),
        energy: n(dbAudit.energyInr ?? 0),
        fixed: n(dbAudit.fixedInr ?? 0),
        duty: n(dbAudit.electricityDutyInr ?? 0),
        fuel: n(dbAudit.fppasInr ?? 0),
        total: n(dbAudit.netPayableInr),
        source: "mp_audit_db"
      };
    }

    // 2. Direct actuals provided by the proposal flow.
    const actual = n(Number(input.monthlyBillActuals?.[monthKey]) || 0);
    if (units <= 0 && actual <= 0) {
      return { label, units: 0, energy: 0, fixed: 0, duty: 0, fuel: 0, total: 0, source: "no_consumption" };
    }

    // 3. Engine recompute via new MP tariff data.
    const breakdown = calculateMpBill({
      discomCode,
      category,
      units,
      sanctionedLoadKw: input.connectedLoadKw,
      contractDemandKva: input.contractDemandKva,
      area,
      fppasPct: input.monthlyFppasPct?.[monthKey],
      agjyClaimed: input.agjyClaimed ?? (category === "LV1.2" && units > 0 && units <= 150)
    });

    if (actual > 0) {
      return {
        label,
        units,
        energy: n(breakdown.energyCharge),
        fixed: n(breakdown.fixedCharge),
        duty: n(breakdown.electricityDuty),
        fuel: n(breakdown.fppasCharge),
        total: actual,
        source: "actual_input"
      };
    }

    return {
      label,
      units,
      energy: n(breakdown.energyCharge),
      fixed: n(breakdown.fixedCharge),
      duty: n(breakdown.electricityDuty),
      fuel: n(breakdown.fppasCharge),
      total: n(breakdown.netPayable),
      source: "mp_engine_2025_26"
    };
  });

  const totals = rows.reduce<PptAuditRow>(
    (acc, r) => ({
      label: "Total",
      units: acc.units + r.units,
      energy: acc.energy + r.energy,
      fixed: acc.fixed + r.fixed,
      duty: acc.duty + r.duty,
      fuel: acc.fuel + r.fuel,
      total: acc.total + r.total,
      source: "mp_engine_2025_26"
    }),
    { label: "Total", units: 0, energy: 0, fixed: 0, duty: 0, fuel: 0, total: 0, source: "mp_engine_2025_26" }
  );

  const summer = rows.slice(3, 7).reduce((sum, r) => sum + r.total, 0); // Apr-Jul
  const summerPct = totals.total > 0 ? n((summer / totals.total) * 100) : 0;

  return { rows, totals, summerPct, fixedAnnual: totals.fixed, discomCode, category };
}
