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
 *   3. Engine output from `calculateMpBill`, which auto-selects FY 2025-26
 *      before APR-2026 and FY 2026-27 from APR-2026 onward.
 *
 * Net effect: any month for which we have a saved audit row in Supabase is
 * shown EXACTLY as the audit calculated it. Other months are recomputed
 * deterministically (no two-point linear extrapolation hacks).
 */

import { calculateMpBill } from "@/lib/mp-bill-engine";
import {
  MP_TARIFF_FY_2025_26,
  detectMpDiscomFromAddress,
  resolveMpDiscomFromHint,
  type MpAreaProfile,
  type MpDiscomCode,
  type MpTariffCategory
} from "@/lib/mp-tariff-2025-26";
import { MP_TARIFF_FY_2026_27, isFY2026_27OrLater } from "@/lib/mp-tariff-2026-27";
import { engineBillMonthIsoForRow, monthKeyFromBillMonthLabel } from "@/lib/mp-bill-month";
import type { MonthlyUnits } from "@/lib/types";
import { resolveMpSmartBilling, type MpSmartBillingResolution } from "@/lib/mp-smart-billing";

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
  source: "mp_audit_db" | "mp_engine_2025_26" | "mp_engine_2026_27" | "actual_input" | "no_consumption";
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
  /** Dedicated purpose line (e.g. Shops/Showrooms) — multi-factor LV2 resolver. */
  purposeOfSupply?: string;
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
  /**
   * Fixed charge (₹) printed on an actual bill — used to cross-validate which
   * LV-2.2 sub-type is in use (sanctioned-load-based vs demand-based).
   * E.g. if bill shows FC = ₹720 and load = 5 kW → ₹144/kW → sanctioned-load-based.
   */
  billFixedChargeInr?: number;
  /** Energy charges ₹ from OCR (current/reference bill). */
  billEnergyChargesInr?: number;
  /** Electricity Duty ₹ — cross-check Duty line. */
  billElectricityDutyInr?: number;
  /** FPPAS / fuel surcharge ₹ — printed line from reference bill. */
  billFppasInr?: number;
  /** Reference month metered units (for implied ₹/unit from bill). */
  referenceBillUnits?: number;
  /** Bill month on the reference scan (e.g. APR-2026) — used to pick FY for ₹/block when inferring load from printed FC. */
  referenceBillMonth?: string;
};

const n = (v: number) => Math.max(0, Math.round(Number(v) || 0));
const r = (v: number | undefined) => Math.round(Number(v) || 0);

function shouldUseDbAuditOverride(unitsFromInput: number, dbAudit: MpMonthlyAuditOverride | undefined): boolean {
  if (!dbAudit) return false;
  if (!Number.isFinite(dbAudit.netPayableInr) || dbAudit.netPayableInr === 0) return false;
  const dbUnitsRaw = Number(dbAudit.units ?? 0);
  // If DB row has no units metadata, allow it (legacy rows).
  if (!Number.isFinite(dbUnitsRaw) || dbUnitsRaw <= 0) return true;
  // If current input has no units, DB can still be used.
  if (!Number.isFinite(unitsFromInput) || unitsFromInput <= 0) return true;

  const dbUnits = Math.round(dbUnitsRaw);
  const inputUnits = Math.round(unitsFromInput);
  const diff = Math.abs(dbUnits - inputUnits);
  const pct = inputUnits > 0 ? diff / inputUnits : 0;

  // Reject stale/misaligned audited rows (common when old bad scans were saved).
  // Example: current month units=307 but stale DB audit has 347.
  return !(diff >= 10 && pct >= 0.03);
}

/** LV1.2 domestic >150u: ₹/0.1kW block from the tariff year of the reference bill. */
function lv12DomesticPerPointKw(area: MpAreaProfile, referenceBillMonth?: string | null): number {
  const use2627 = isFY2026_27OrLater(referenceBillMonth ?? undefined);
  const t = use2627 ? MP_TARIFF_FY_2026_27["LV1.2"] : MP_TARIFF_FY_2025_26["LV1.2"];
  const f = t.domesticFixed;
  if (!f) return 8.8;
  return area === "rural" ? (f.above150PerPointKwRural ?? 8.2) : (f.above150PerPointKwUrban ?? 8.8);
}

/**
 * Reverse domestic FC: printed FC = perPoint × min(ceil(units/15), ceil(load/0.1)).
 * When sanctioned load OCR is too low, infer a floor kW that matches the bill's FC line.
 */
function inferMinSanctionedLoadKwFromDomesticBill(fcPrinted: number, units: number, perPoint: number): number | null {
  if (!Number.isFinite(fcPrinted) || fcPrinted <= 0) return null;
  if (!Number.isFinite(units) || units <= 150) return null;
  if (!Number.isFinite(perPoint) || perPoint <= 0) return null;

  const cents = Math.round(Math.max(0, units) * 100);
  const B = Math.max(1, Math.floor((cents + 1500 - 1) / 1500));
  let bestS = -1;
  let bestDiff = Infinity;
  const sMax = Math.max(B + 60, 120);
  for (let S = 1; S <= sMax; S += 1) {
    const fcModel = perPoint * Math.min(B, S);
    const diff = Math.abs(fcModel - fcPrinted);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestS = S;
    }
  }
  if (bestS < 1 || bestDiff > 22) return null;

  if (bestS >= B) return Math.max(0.1, B * 0.1);
  return Math.max(0.1, bestS * 0.1);
}

function detectMpDiscom(input: MpPptRowsInput): MpDiscomCode | null {
  const fromHint = resolveMpDiscomFromHint(input.discom ?? "");
  if (fromHint) return fromHint.code;
  const fromState = resolveMpDiscomFromHint(input.state ?? "");
  if (fromState) return fromState.code;
  const fromAddr = detectMpDiscomFromAddress(input.state ?? "");
  if (fromAddr) return fromAddr.code;
  return null;
}

export function isMpProposalContext(input: { state?: string; discom?: string }): boolean {
  return Boolean(detectMpDiscom({ state: input.state, discom: input.discom, monthlyUnits: {} as MonthlyUnits }));
}

/**
 * Build 12 monthly audit rows using the MP dual-FY tariff engine,
 * preferring already-audited Supabase rows for months that have them.
 */
export function buildMpAuditRows(input: MpPptRowsInput): {
  rows: PptAuditRow[];
  totals: PptAuditRow;
  summerPct: number;
  fixedAnnual: number;
  discomCode: MpDiscomCode;
  category: MpTariffCategory;
  smartBilling: MpSmartBillingResolution;
} {
  const discomCode = detectMpDiscom(input) ?? "MPMKVVCL";
  const area: MpAreaProfile = input.areaProfile ?? "urban";

  const smartBilling = resolveMpSmartBilling({
    tariffCategoryRaw: input.tariffCategory,
    purposeOfSupply: input.purposeOfSupply || input.connectionType,
    connectionType: input.connectionType,
    sanctionedLoadKw: input.connectedLoadKw,
    contractDemandKva: input.contractDemandKva,
    area,
    energyChargesInr: input.billEnergyChargesInr,
    fixedChargesInr: input.billFixedChargeInr,
    electricityDutyInr: input.billElectricityDutyInr,
    referenceUnits: input.referenceBillUnits,
    billMonth: input.referenceBillMonth
  });
  const category = smartBilling.category;

  const erOv = smartBilling.energyRateOverridePerUnit;
  const fcOv = smartBilling.fixedChargeOverrideInr;

  /** Sanctioned load (kW): prefer form/OCR, but bump from reference bill FC when domestic OCR load caps FC too low. */
  let sanctionedLoadKwForEngine = (() => {
    const raw = Number(input.connectedLoadKw);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  })();

  if (category === "LV1.2" && fcOv == null) {
    const fcPrinted = Number(input.billFixedChargeInr);
    const refU = Number(input.referenceBillUnits);
    const refMonth = input.referenceBillMonth?.trim() || undefined;
    const perPoint = lv12DomesticPerPointKw(area, refMonth);
    if (Number.isFinite(fcPrinted) && fcPrinted > 0 && Number.isFinite(refU) && refU > 150 && perPoint > 0) {
      const inferred = inferMinSanctionedLoadKwFromDomesticBill(fcPrinted, refU, perPoint);
      if (inferred != null && inferred > 0) {
        sanctionedLoadKwForEngine = Math.max(sanctionedLoadKwForEngine, inferred);
      }
    }
  }

  const rows: PptAuditRow[] = MONTH_LABELS.map((label, i) => {
    const monthKey = MONTH_KEYS[i];
    const units = n(input.monthlyUnits[monthKey]);

    const dbAudit = input.monthlyAuditOverrides?.[monthKey];
    if (shouldUseDbAuditOverride(units, dbAudit)) {
      const safeDbAudit = dbAudit as MpMonthlyAuditOverride;
      return {
        label,
        units: n(safeDbAudit.units ?? units),
        energy: n(safeDbAudit.energyInr ?? 0),
        fixed: n(safeDbAudit.fixedInr ?? 0),
        duty: r(safeDbAudit.electricityDutyInr),
        fuel: r(safeDbAudit.fppasInr),
        total: n(safeDbAudit.netPayableInr),
        source: "mp_audit_db"
      };
    }

    const actual = n(Number(input.monthlyBillActuals?.[monthKey]) || 0);
    if (units <= 0 && actual <= 0) {
      return { label, units: 0, energy: 0, fixed: 0, duty: 0, fuel: 0, total: 0, source: "no_consumption" };
    }

    // Bill month drives FY tariff + monthly FPPAS. Align each row to the real
    // calendar year implied by `referenceBillMonth` (e.g. MAR-2026 → Jul row =
    // 2025-07) so domestic FC blocks match printed MPEZ bills (was wrongly using
    // FY 2026-27 for mid-2025 rows when ISO month parsing failed).
    const rowBillMonthIso = engineBillMonthIsoForRow(i, input.referenceBillMonth);
    const refMonthKey = monthKeyFromBillMonthLabel(input.referenceBillMonth);
    const printedFc = Number(input.billFixedChargeInr);
    const usePrintedFcThisRow =
      category === "LV1.2" &&
      refMonthKey === monthKey &&
      Number.isFinite(printedFc) &&
      printedFc > 0;
    const rowFcOverride =
      typeof fcOv === "number" && Number.isFinite(fcOv) ? Math.round(fcOv) : usePrintedFcThisRow ? Math.round(printedFc) : undefined;
    const usePrintedBillLinesThisRow = refMonthKey === monthKey;
    const printedDuty = Number(input.billElectricityDutyInr);
    const printedFppas = Number(input.billFppasInr);

    const breakdown = calculateMpBill({
      discomCode,
      category,
      units,
      sanctionedLoadKw: sanctionedLoadKwForEngine > 0 ? sanctionedLoadKwForEngine : undefined,
      contractDemandKva: input.contractDemandKva,
      area,
      billMonth: rowBillMonthIso,
      // Explicit monthly FPPAS override takes precedence over auto-lookup.
      fppasPct: input.monthlyFppasPct?.[monthKey],
      // AGJY applies to all LV-1.2 consumers regardless of consumption level.
      agjyClaimed: input.agjyClaimed ?? (category === "LV1.2" && units > 0),
      energyRateOverridePerUnit: erOv,
      fixedChargeOverrideInr: rowFcOverride,
      printedElectricityDutyInr:
        usePrintedBillLinesThisRow && Number.isFinite(printedDuty) ? printedDuty : undefined,
      printedFppasInr:
        usePrintedBillLinesThisRow && Number.isFinite(printedFppas) ? printedFppas : undefined
    });

    const engineSource: PptAuditRow["source"] = isFY2026_27OrLater(rowBillMonthIso)
      ? "mp_engine_2026_27"
      : "mp_engine_2025_26";

    if (actual > 0) {
      return {
        label,
        units,
        energy: n(breakdown.energyCharge),
        fixed: n(breakdown.fixedCharge),
        duty: r(breakdown.electricityDuty),
        fuel: r(breakdown.fppasCharge),
        total: actual,
        source: "actual_input"
      };
    }

    return {
      label,
      units,
      energy: n(breakdown.energyCharge),
      fixed: n(breakdown.fixedCharge),
      duty: r(breakdown.electricityDuty),
      fuel: r(breakdown.fppasCharge),
      total: n(breakdown.netPayable),
      source: engineSource
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

  const summer = rows.slice(3, 7).reduce((sum, r) => sum + r.total, 0);
  const summerPct = totals.total > 0 ? n((summer / totals.total) * 100) : 0;

  return { rows, totals, summerPct, fixedAnnual: totals.fixed, discomCode, category, smartBilling };
}
