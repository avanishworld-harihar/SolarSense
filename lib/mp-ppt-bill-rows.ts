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
  /**
   * Other charges not captured in energy/fixed/duty/fuel:
   * e.g. Welding/PF Surcharge, Metering Charges, Penal Charges.
   * Auto-computed as max(0, netPayableInr − (energy+fixed+duty+fuel))
   * when an uploaded bill's components don't sum to the printed total.
   * Always 0 for engine-calculated months.
   */
  other: number;
  /**
   * Atal Griha Jyoti / state subsidy credit (₹, negative when applied). LV-1.2 only.
   * Shown separately so Energy+Fixed+Duty+Fuel+Subsidy = Net Bill.
   */
  subsidy: number;
  total: number;
  /** Provenance of the row total — useful for QA tooltips later. */
  source: "mp_audit_db" | "mp_engine_2025_26" | "mp_engine_2026_27" | "actual_input" | "no_consumption";
};

export type MpMonthlyAuditOverride = {
  /** ₹ printed/audited net payable for this month (= Current Month Bill). */
  netPayableInr: number;
  energyInr?: number;
  fixedInr?: number;
  fppasInr?: number;
  electricityDutyInr?: number;
  units?: number;
  /**
   * Welding/PF Surcharge or any other penalty/metering charge extracted
   * from the uploaded bill (₹). When absent, auto-computed as the gap
   * between netPayableInr and (energy+fixed+duty+fuel).
   */
  pfSurchargeInr?: number;
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

function hasAlignedOverrideUnits(unitsFromInput: number, dbAudit: MpMonthlyAuditOverride | undefined): boolean {
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

function shouldUseAuditOverride(
  unitsFromInput: number,
  dbAudit: MpMonthlyAuditOverride | undefined,
  expected: { energyCharge: number; fixedCharge: number },
  category: MpTariffCategory
): boolean {
  if (!hasAlignedOverrideUnits(unitsFromInput, dbAudit)) return false;

  const energy = Number(dbAudit?.energyInr);
  const fixed = Number(dbAudit?.fixedInr);
  if (!Number.isFinite(energy) || !Number.isFinite(fixed)) {
    // Net-only legacy rows cannot safely drive component columns.
    return false;
  }

  if (category === "LV2.2") {
    const energyTol = Math.max(100, Math.abs(expected.energyCharge) * 0.08);
    const fixedTol = Math.max(25, Math.abs(expected.fixedCharge) * 0.15);
    return (
      Math.abs(energy - expected.energyCharge) <= energyTol &&
      Math.abs(fixed - expected.fixedCharge) <= fixedTol
    );
  }

  // Generic guard: reject obvious component swaps or stale rows.
  const energyTol = Math.max(100, Math.abs(expected.energyCharge) * 0.25);
  const fixedTol = Math.max(100, Math.abs(expected.fixedCharge) * 0.35);
  return (
    Math.abs(energy - expected.energyCharge) <= energyTol &&
    Math.abs(fixed - expected.fixedCharge) <= fixedTol
  );
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

function inferLv22SanctionedLoadKwFromFixedCharge(
  fcPrinted: number,
  units: number,
  area: MpAreaProfile,
  billMonth?: string | null
): number | null {
  if (!Number.isFinite(fcPrinted) || fcPrinted <= 0) return null;
  if (!Number.isFinite(units) || units <= 0) return null;
  const use2627 = isFY2026_27OrLater(billMonth ?? undefined);
  const t = use2627 ? MP_TARIFF_FY_2026_27["LV2.2"] : MP_TARIFF_FY_2025_26["LV2.2"];
  const lf = t.loadFixed;
  if (!lf) return null;
  const highUse = units > (lf.consumptionSplitUnits ?? 50);
  const perKw = highUse
    ? area === "rural" ? lf.perKwRuralHigh ?? 0 : lf.perKwUrbanHigh ?? 0
    : area === "rural" ? lf.perKwRuralLow ?? 0 : lf.perKwUrbanLow ?? 0;
  if (!Number.isFinite(perKw) || perKw <= 0) return null;
  const inferred = fcPrinted / perKw;
  return inferred > 0 && inferred <= 10.5 ? Math.round(inferred * 100) / 100 : null;
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

  const erOv = category === "LV2.2" ? undefined : smartBilling.energyRateOverridePerUnit;
  const fcOv = category === "LV2.2" ? undefined : smartBilling.fixedChargeOverrideInr;

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
  if (category === "LV2.2" && sanctionedLoadKwForEngine <= 0) {
    const fcPrinted = Number(input.billFixedChargeInr);
    const refU = Number(input.referenceBillUnits);
    const refMonth = input.referenceBillMonth?.trim() || undefined;
    const inferred = inferLv22SanctionedLoadKwFromFixedCharge(fcPrinted, refU, area, refMonth);
    if (inferred != null && inferred > 0) {
      sanctionedLoadKwForEngine = inferred;
    }
  }

  const rows: PptAuditRow[] = MONTH_LABELS.map((label, i) => {
    const monthKey = MONTH_KEYS[i];
    const units = n(input.monthlyUnits[monthKey]);

    const actual = n(Number(input.monthlyBillActuals?.[monthKey]) || 0);
    if (units <= 0 && actual <= 0) {
      return { label, units: 0, energy: 0, fixed: 0, duty: 0, fuel: 0, other: 0, subsidy: 0, total: 0, source: "no_consumption" };
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
    // Proposal flow should remain rule-first even with only 1-2 uploaded bills.
    // We do not pin monthly duty/FPPAS to one scanned bill line here.

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
      // AGJY: LV-1.2 only; engine applies subsidy only when month ≤150 u (see ATAL_GRIHA_JYOTI).
      agjyClaimed: input.agjyClaimed ?? (category === "LV1.2" && units > 0),
      energyRateOverridePerUnit: erOv,
      fixedChargeOverrideInr: rowFcOverride
    });

    const dbAudit = input.monthlyAuditOverrides?.[monthKey];
    if (shouldUseAuditOverride(units, dbAudit, breakdown, category)) {
      const safeDbAudit = dbAudit as MpMonthlyAuditOverride;
      const energy = n(safeDbAudit.energyInr ?? 0);
      const fixed  = n(safeDbAudit.fixedInr ?? 0);
      const duty   = r(safeDbAudit.electricityDutyInr);
      const fuel   = r(safeDbAudit.fppasInr);
      const netFromBill = n(safeDbAudit.netPayableInr);
      // Standard component sum (no penalty charges).
      const compSum = energy + fixed + duty + fuel;
      // "other" tracks PF/Welding surcharge or metering charges — for internal
      // reference only. It is EXCLUDED from the proposal total so that the
      // proposal always shows base tariff charges only (solar savings are
      // calculated on these base charges; penalties can reduce post-solar).
      const other = typeof safeDbAudit.pfSurchargeInr === "number"
        ? Math.max(0, safeDbAudit.pfSurchargeInr)
        : Math.max(0, netFromBill - compSum);
      return {
        label,
        units: n(safeDbAudit.units ?? units),
        energy,
        fixed,
        duty,
        fuel,
        other,
        subsidy: 0,
        // Use base charges sum as total (excludes PF/metering penalties).
        // For typical 2-bill uploads (APR+MAR), other=0 so total=netFromBill exactly.
        total: other > 0 ? compSum : netFromBill,
        source: "mp_audit_db"
      };
    }

    const engineSource: PptAuditRow["source"] = isFY2026_27OrLater(rowBillMonthIso)
      ? "mp_engine_2026_27"
      : "mp_engine_2025_26";

    if (actual > 0) {
      const subsidy = r(breakdown.subsidyCredit);
      return {
        label,
        units,
        energy: n(breakdown.energyCharge),
        fixed: n(breakdown.fixedCharge),
        duty: r(breakdown.electricityDuty),
        fuel: r(breakdown.fppasCharge),
        other: 0,
        subsidy,
        // Net must match tariff engine (includes AGJY); do not pin to uploaded
        // gross lines alone or the row no longer reconciles with components.
        total: n(breakdown.netPayable),
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
      other: 0,
      subsidy: r(breakdown.subsidyCredit),
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
      other: acc.other + r.other,
      subsidy: acc.subsidy + r.subsidy,
      total: acc.total + r.total,
      source: "mp_engine_2025_26"
    }),
    { label: "Total", units: 0, energy: 0, fixed: 0, duty: 0, fuel: 0, other: 0, subsidy: 0, total: 0, source: "mp_engine_2025_26" }
  );

  const summer = rows.slice(3, 7).reduce((sum, r) => sum + r.total, 0);
  const summerPct = totals.total > 0 ? n((summer / totals.total) * 100) : 0;

  return { rows, totals, summerPct, fixedAnnual: totals.fixed, discomCode, category, smartBilling };
}
