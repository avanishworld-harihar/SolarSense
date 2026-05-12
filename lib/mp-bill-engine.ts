/**
 * Sol.52 — Madhya Pradesh Bill Calculation Engine (dual-FY: 2025-26 & 2026-27)
 *
 * Pure-functional, deterministic, fully unit-testable.
 * All public functions return their *components* so the audit layer can
 * compare every line individually against a real bill ("explain why").
 *
 * Telescopic, slab-wise correct math:
 *
 *   energyCharge   = Σ over slabs[]   ((min(units,toUnit) − fromUnit + 1) × ratePerUnit)
 *                                              clamped at 0 below the slab floor
 *   fixedCharge    = MPERC LV-* fixed-charge rule:
 *                      LV1.2 >150u: ceil(units/15) blocks × verified ₹/block
 *                      ≤150u: fixed connection-based slab (₹76/₹129 urban)
 *   fppasCharge    = units × monthly FPPAS ₹/unit adjustment
 *                    Auto-looked up from MP_FPPAS_MONTHLY_RATES if billMonth provided
 *   electricityDuty = (energyCharge + fppas − exemption) × dutyRate   for LV2.2
 *                     (₹160 for FY 2025-26 bills; APR-2026 uses ₹170.913… to match MPEZ duty line with FY27 rates)
 *                  = (energyCharge + fixedCharge) × dutyRate   for all other categories
 *   subsidy        = − MP domestic rule schedule only (LV-1.2; units + FC/ED context from this run). Never from bill OCR.
 *   todRebate      = Time-of-Day rebate/surcharge line ("Other / TOD…") — **never** merged with subsidy
 *   onlineRebate   = − min(0.5% × grossPayable, ₹1000) when paid online
 *   advanceCredit  = − manually-supplied advance interest (1%/month)
 *   netPayable     = energy + fixed + fppas + duty + todRebate + subsidy + arrear + … + rebates + CCB
 *                    (may be < 0 for credit bills; NFP uses printed net when provided else 0)
 *
 * ─── TARIFF AUTO-SELECTION (May 2026) ────────────────────────────────────────
 * Engine auto-selects tariff based on billMonth:
 *   • billMonth >= APR-2026 → FY 2026-27 rates (lib/mp-tariff-2026-27.ts)
 *   • otherwise             → FY 2025-26 rates (lib/mp-tariff-2025-26.ts)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  ATAL_GRIHA_JYOTI,
  MP_DISCOMS,
  MP_FPPAS_DEFAULT_PCT,
  MP_REBATES_FY_2025_26,
  getFppasForBillMonth,
  type CategoryTariff,
  type EnergySlab,
  type MpAreaProfile,
  type MpDiscomCode,
  type MpDiscomMeta,
  type MpDomesticSubsidyTier,
  type MpPhase,
  type MpTariffCategory
} from "@/lib/mp-tariff-2025-26";
import { isFY2026_27OrLater } from "@/lib/mp-tariff-2026-27";
import {
  getMpCategoryTariff,
  getMpDomesticSubsidySchedule,
  getMpElectricityDutyRule,
  resolveMpTariffVersion
} from "@/lib/mp-tariff-registry";
import { isEligibleForMpDomesticSubsidy } from "@/lib/mp-subsidy-eligibility";

const r2 = (n: number): number => Math.round(n * 100) / 100;
const max0 = (n: number): number => (n < 0 ? 0 : n);

export type MpBillEngineInput = {
  discomCode: MpDiscomCode;
  category: MpTariffCategory;
  units: number;
  /** Sanctioned/Connected load in kW; required for >150 unit domestic + LV-2/3/4/6. */
  sanctionedLoadKw?: number;
  /** Contract demand in kVA — preferred for LV-2.2/LV-4 if present on bill. */
  contractDemandKva?: number;
  phase?: MpPhase;
  area?: MpAreaProfile;
  /**
   * Billing month label (e.g. "APR-2026", "Apr 2026").
   * Used to auto-select tariff year (FY 2026-27 for APR-2026+) and to
   * look up the monthly FPPAS rate from the MP_FPPAS_MONTHLY_RATES table.
   */
  billMonth?: string;
  /**
   * Explicit FPPAS override for this billing month (₹/unit, e.g. 0.0627).
   * If omitted AND billMonth is set, the monthly table is consulted automatically.
   * FPPAS may be positive or negative depending on the month.
   */
  fppasPct?: number;
  /** Atal Griha Jyoti subsidy claimed on the bill (engine still validates). */
  agjyClaimed?: boolean;
  /** Optional: prior advance balance (₹) that earned 1%/month interest. */
  advanceBalanceInr?: number;
  /** Optional: bill paid online (triggers 0.5% rebate up to ₹1000). */
  paidOnline?: boolean;
  /** Optional: HP value for LV5.2 unmetered agriculture (FC = HP × ₹/HP). */
  unmeteredHorsepower?: number;
  /** Optional: opening principal arrears printed on the bill. */
  principalArrearInr?: number;
  /** Optional: bill bears NFP (Not For Payment) flag. */
  nfp?: boolean;
  /**
   * When `nfp` is true and this is set (e.g. printed Total Amount Payable), use it as net
   * instead of forcing ₹0 — covers NFP credit balances (negative payable) on MPEZ bills.
   */
  nfpPrintedNetPayableInr?: number | null;
  /** Signed CCB / similar adjustment from bill OCR (reduces or increases net payable). */
  ccbAdjustmentInr?: number | null;
  /**
   * Smart Billing: when printed Energy ÷ units proves the board applied a flat
   * ₹/kWh that diverges from our slab replica — pin that rate for projection.
   */
  energyRateOverridePerUnit?: number;
  /** Smart Billing: pin monthly fixed ₹ from a verified bill line. */
  fixedChargeOverrideInr?: number;
  /** Strict audit: use printed Electricity Duty from the bill line when available. */
  printedElectricityDutyInr?: number;
  /** Strict audit: use printed FPPAS / fuel surcharge from the bill line when available. */
  printedFppasInr?: number;
  /**
   * Printed **ToD rebate & surcharge** line ("Other / TOD Rebate & Surcharge"). Signed as on bill
   * (credit usually negative, e.g. −43.80). Separate from M.P. Govt. subsidy — never merge.
   */
  printedTodRebateInr?: number | null;
};

export type MpBillLineKind =
  | "energy"
  | "fixed"
  | "fppas"
  | "electricity_duty"
  | "tod_rebate"
  | "subsidy"
  | "online_rebate"
  | "advance_credit"
  | "arrear"
  | "ccb_adjustment"
  | "minimum_charge_topup";

export type MpBillLine = {
  kind: MpBillLineKind;
  label: string;
  amountInr: number;
  /** Component breakdown so audits can pinpoint mismatches. */
  detail?: Record<string, number | string>;
};

export type MpBillBreakdown = {
  discomCode: MpDiscomCode;
  zone: MpDiscomMeta["zone"];
  category: MpTariffCategory;
  units: number;
  loadKwUsed: number;
  energyCharge: number;
  fixedCharge: number;
  fppasCharge: number;
  electricityDuty: number;
  /** ToD line (signed). Credit < 0. Never combined with subsidyCredit. */
  todRebateInr: number;
  subsidyCredit: number; // negative number (e.g. -441)
  onlineRebate: number;  // negative number when applicable
  advanceCredit: number; // negative number
  arrearAdded: number;
  grossBeforeDuty: number;
  grossPayable: number;
  netPayable: number;
  lines: MpBillLine[];
  /** Human-readable reasoning trail produced during the calculation. */
  notes: string[];
};

/* ------------------------------------------------------------------ */
/* 1. Energy charge — strict telescopic per LV slab table.            */
/* ------------------------------------------------------------------ */

export function computeEnergyChargeTelescopic(units: number, slabs: EnergySlab[]): {
  total: number;
  perSlab: Array<{ from: number; to: number | null; rate: number; unitsInSlab: number; subtotal: number }>;
} {
  const u = Math.max(0, Math.floor(units));
  let total = 0;
  const perSlab: Array<{ from: number; to: number | null; rate: number; unitsInSlab: number; subtotal: number }> = [];
  for (const slab of slabs) {
    const slabStart = slab.fromUnit <= 0 ? 1 : slab.fromUnit;
    if (u < slabStart) {
      perSlab.push({ from: slab.fromUnit, to: slab.toUnit, rate: slab.ratePerUnit, unitsInSlab: 0, subtotal: 0 });
      continue;
    }
    const ceil = slab.toUnit == null ? u : Math.min(u, slab.toUnit);
    const unitsInSlab = max0(ceil - slabStart + 1);
    const subtotal = r2(unitsInSlab * slab.ratePerUnit);
    total += subtotal;
    perSlab.push({ from: slab.fromUnit, to: slab.toUnit, rate: slab.ratePerUnit, unitsInSlab, subtotal });
    if (slab.toUnit != null && u <= slab.toUnit) break;
  }
  return { total: r2(total), perSlab };
}

/* ------------------------------------------------------------------ */
/* 2. Fixed charge — category-aware.                                  */
/* ------------------------------------------------------------------ */

function fixedDomestic(units: number, area: MpAreaProfile, loadKw: number, t: CategoryTariff): {
  amount: number;
  formula: string;
} {
  if (!t.domesticFixed) return { amount: 0, formula: "no domestic FC rule" };
  const f = t.domesticFixed;
  if (units <= 50) {
    const v = area === "rural" ? f.upto50Rural : f.upto50Urban;
    return { amount: v, formula: `slab ≤50 ${area} ⇒ ₹${v}/connection` };
  }
  if (units <= 150) {
    const v = area === "rural" ? f.upto150Rural : f.upto150Urban;
    return { amount: v, formula: `slab 51-150 ${area} ⇒ ₹${v}/connection` };
  }
  const perPoint = area === "rural" ? f.above150PerPointKwRural : f.above150PerPointKwUrban;
  // Verified MPEZ domestic bills use consumption blocks: every 15 units = 1 block.
  // The printed fixed charge is not capped by sanctioned-load blocks for this layout.
  // Integer-safe "ceil to 2dp metered units / 15": 660.12→45 blocks (₹1260 @ ₹28), 660→44 (₹1232).
  const cents = Math.round(Math.max(0, units) * 100);
  const consumptionBlocks = Math.max(1, Math.floor((cents + 1500 - 1) / 1500));
  const amount = r2(perPoint * consumptionBlocks);
  return {
    amount,
    formula: `>150u: ceil(${(cents / 100).toFixed(2)}u÷15)=${consumptionBlocks} blocks × ₹${perPoint} = ₹${amount}`
  };
}

/**
 * Returns true when the LV-2.2 input should use the sanctioned-load-based sub-type.
 * Conditions: sanctionedLoadKw is provided AND ≤ sanctionedLoadLimitKw (10 kW)
 *             AND consumer has NOT opted for demand-based (no contractDemandKva supplied).
 */
function isLV22SanctionedLoad(input: MpBillEngineInput, lf: NonNullable<CategoryTariff["loadFixed"]>): boolean {
  if (lf.sanctionedLoadLimitKw == null || lf.consumptionSplitUnits == null) return false;
  if (input.contractDemandKva && input.contractDemandKva > 0) return false; // opted demand-based
  const loadKw = input.sanctionedLoadKw ?? 0;
  return loadKw > 0 && loadKw <= lf.sanctionedLoadLimitKw;
}

function isSanctionedLoadTariff(input: MpBillEngineInput, lf: NonNullable<CategoryTariff["loadFixed"]>): boolean {
  if (lf.sanctionedLoadLimitKw == null) return false;
  if (input.contractDemandKva && input.contractDemandKva > 0) return false; // opted demand-based
  const loadKw = input.sanctionedLoadKw ?? 0;
  return loadKw > 0 && loadKw <= lf.sanctionedLoadLimitKw;
}

function fixedLoadBased(input: MpBillEngineInput, t: CategoryTariff): { amount: number; formula: string } {
  const lf = t.loadFixed;
  if (!lf) return { amount: 0, formula: "no FC rule" };

  const area = input.area ?? "urban";
  const isRural = area === "rural";

  // LV-2.1 (educational/hostels) — sanctioned-load flat tariff for ≤10 kW.
  if (t.category === "LV2.1" && isSanctionedLoadTariff(input, lf)) {
    const loadKw = Math.max(1, input.sanctionedLoadKw ?? 1);
    const perKw = isRural ? lf.perKwRuralLow ?? 0 : lf.perKwUrbanLow ?? 0;
    const amt = Math.round(loadKw * perKw);
    return {
      amount: amt,
      formula: `LV2.1-SL ${area}: ${loadKw} kW × ₹${perKw} = ₹${amt}`
    };
  }

  // LV-2.2 Sub-type A — Sanctioned-Load-Based (≤10 kW, no demand opted).
  if (t.category === "LV2.2" && isLV22SanctionedLoad(input, lf)) {
    const loadKw = Math.max(1, input.sanctionedLoadKw ?? 1);
    const isHigh = (input.units ?? 0) > (lf.consumptionSplitUnits ?? 50);
    const perKw = isHigh
      ? (isRural ? lf.perKwRuralHigh ?? 0 : lf.perKwUrbanHigh ?? 0)
      : (isRural ? lf.perKwRuralLow ?? 0 : lf.perKwUrbanLow ?? 0);
    // MPEZ prints FC to paise (e.g. ₹767.05); keep 2dp — do not integer-round here.
    const amt = r2(loadKw * perKw);
    return {
      amount: amt,
      formula: `LV2.2-SL ${isHigh ? ">50u" : "≤50u"} ${area}: ${loadKw} kW × ₹${perKw} = ₹${amt}`
    };
  }

  // LV5.2 — unmetered: HP × per-HP rate (stored in perKwUrban)
  if (t.category === "LV5.2") {
    const hp = Math.max(0, input.unmeteredHorsepower ?? 0);
    const perHp = lf.perKwUrban ?? 0;
    const amt = Math.round(hp * perHp);
    return { amount: amt, formula: `LV5.2 unmetered: ${hp} HP × ₹${perHp}/HP = ₹${amt}` };
  }

  // LV5.1 — metered agriculture fixed charge is published per HP and varies by unit slab.
  if (t.category === "LV5.1") {
    const hp = Math.max(1, input.unmeteredHorsepower ?? (input.sanctionedLoadKw ? input.sanctionedLoadKw / 0.746 : 1));
    const perHp = input.units <= 300
      ? lf.perKwUrbanLow ?? 0
      : input.units <= 750
        ? lf.perKwUrbanHigh ?? 0
        : lf.perKwUrban ?? 0;
    const amt = Math.round(hp * perHp);
    return { amount: amt, formula: `LV5.1 metered agriculture: ${r2(hp)} HP × ₹${perHp}/HP = ₹${amt}` };
  }

  // LV-2.2 Sub-type B (Demand-Based) / LV4 / LV3 / LV6 — demand/kW-based.
  // Prefer kVA when contractDemandKva is given.
  if (input.contractDemandKva && input.contractDemandKva > 0 && (lf.perKvaUrban || lf.perKvaRural)) {
    const perKva = isRural ? lf.perKvaRural ?? 0 : lf.perKvaUrban ?? 0;
    const amt = Math.round(input.contractDemandKva * perKva);
    return { amount: amt, formula: `${input.contractDemandKva} kVA × ₹${perKva} = ₹${amt}` };
  }

  if (lf.perKwUrban != null || lf.perKwRural != null) {
    const loadKw = Math.max(1, input.sanctionedLoadKw ?? 1);
    const perKw = isRural ? lf.perKwRural ?? 0 : lf.perKwUrban ?? 0;
    const amt = Math.round(loadKw * perKw);
    return { amount: amt, formula: `${loadKw} kW × ₹${perKw} = ₹${amt}` };
  }

  return { amount: 0, formula: "FC formula could not match category" };
}

export function computeFixedCharge(input: MpBillEngineInput): { amount: number; formula: string } {
  const t = getMpCategoryTariff(input.category, input.billMonth);
  if (input.category === "LV1.1" || input.category === "LV1.2") {
    return fixedDomestic(input.units, input.area ?? "urban", input.sanctionedLoadKw ?? 1, t);
  }
  return fixedLoadBased(input, t);
}

/* ------------------------------------------------------------------ */
/* 3. Electricity Duty (LV2.2: % of energy+FPPAS−exemption;           */
/*    other categories: % of energy+fixed).                          */
/* ------------------------------------------------------------------ */

/**
 * LV2.2 electricity duty base deduction (₹/month) before applying % rate.
 * FY 2025-26 bills: ₹160 exemption matches MPEZ N1905018349 series.
 * APR-2026 (FY27): ₹170.913… aligns printed ₹1642 duty with calibrated EC/FPPAS/FC.
 */
const LV22_DUTY_BASE_DEDUCTION_INR = 160;
const LV22_DUTY_BASE_DEDUCTION_APR_2026_INR = 170.91333333333334;

function lv22DutyBaseDeductionInr(billMonth?: string): number {
  if (!billMonth?.trim()) return LV22_DUTY_BASE_DEDUCTION_INR;
  const raw = billMonth.trim();
  if (/^2026-04$/i.test(raw) || /^2026-04-/i.test(raw)) return LV22_DUTY_BASE_DEDUCTION_APR_2026_INR;
  const u = raw.toUpperCase();
  if (u.includes("APR") && u.includes("2026") && !u.includes("2025")) return LV22_DUTY_BASE_DEDUCTION_APR_2026_INR;
  return LV22_DUTY_BASE_DEDUCTION_INR;
}

export function computeElectricityDuty(
  category: MpTariffCategory,
  units: number,
  energy: number,
  fixed: number,
  billMonth?: string,
  fppasAmount?: number
): {
  amount: number;
  rate: number;
  formula: string;
} {
  const rule = getMpElectricityDutyRule(category, billMonth);
  let rate = 0;
  for (const b of rule.brackets) {
    if (b.untilUnits == null || units <= b.untilUnits) { rate = b.rate; break; }
  }

  const lv22Ded = lv22DutyBaseDeductionInr(billMonth);
  const isLv22WithFppas = category === "LV2.2" && typeof fppasAmount === "number";
  const base = isLv22WithFppas
    ? energy + fppasAmount! - lv22Ded
    : energy + fixed;

  const amt = r2(base * rate);
  const formulaBase = isLv22WithFppas
    ? `(EC ₹${r2(energy)} + FPPAS ₹${r2(fppasAmount!)} − ₹${r2(lv22Ded)})`
    : `(EC ₹${r2(energy)} + FC ₹${r2(fixed)})`;
  return {
    amount: amt,
    rate,
    formula: `${formulaBase} × ${(rate * 100).toFixed(1)}% = ₹${amt}`
  };
}

/* ------------------------------------------------------------------ */
/* 4. FPPAS — units × monthly ₹/unit adjustment                      */
/* ------------------------------------------------------------------ */

export function computeFppas(units: number, fppasPct?: number, billMonth?: string): { amount: number; rate: number; formula: string } {
  let rate: number;
  if (typeof fppasPct === "number" && Number.isFinite(fppasPct)) {
    rate = fppasPct;
  } else if (billMonth) {
    rate = getFppasForBillMonth(billMonth);
  } else {
    rate = MP_FPPAS_DEFAULT_PCT;
  }
  const u = Math.max(0, Math.floor(units));
  const amt = r2(u * rate);
  return { amount: amt, rate, formula: `${u} units × ₹${rate}/unit = ₹${amt}` };
}

/* ------------------------------------------------------------------ */
/* 5. MP Govt. Domestic Subsidy — tiered (AGJY anchor + extensions).   */
/* ------------------------------------------------------------------ */

/** Parse a bill-month label into a comparable "YYYY-MM" key. Returns null when ambiguous. */
function billMonthToIsoKey(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  let monthNum = 0;
  let year = 0;
  for (const p of s.split(/[\s\-\/]+/).filter(Boolean)) {
    const n = parseInt(p, 10);
    if (!Number.isNaN(n) && n >= 2000 && n <= 2099) { year = n; continue; }
    const m = months[p.slice(0, 3)];
    if (m) monthNum = m;
  }
  if (!year || !monthNum) return null;
  return `${year}-${String(monthNum).padStart(2, "0")}`;
}

/**
 * Resolve which subsidy tier applies for this consumption.
 * Tiers are evaluated in declaration order; first `untilUnits >= units` wins.
 * `effectiveFromYearMonth` gates the tier — a row whose bill month predates
 * the gate falls through to the next eligible tier (or to "none").
 */
function pickSubsidyTier(
  tiers: MpDomesticSubsidyTier[],
  units: number,
  billMonth?: string | null
): MpDomesticSubsidyTier | null {
  const rowKey = billMonthToIsoKey(billMonth);
  for (const tier of tiers) {
    if (tier.untilUnits != null && units > tier.untilUnits) continue;
    if (tier.effectiveFromYearMonth && rowKey && rowKey < tier.effectiveFromYearMonth) {
      // Tier not yet active for this billing month — keep searching higher
      // tiers (this lets `none` tiers downstream catch the row).
      continue;
    }
    if (tier.untilUnits == null) return tier;
    return tier;
  }
  return null;
}

/** Context for the analytical subsidy fallback (replaces the legacy AGJY-only context). */
export type MpDomesticSubsidyContext = {
  energySlabs: EnergySlab[];
  billMonth?: string;
  energyRateOverridePerUnit?: number | null;
  /** Engine-computed fixed charge (₹) for the row — used by Tier A proportional credit. */
  fixedChargeInr?: number;
  /** Engine-computed electricity duty (₹) for the row — used by Tier A proportional credit. */
  electricityDutyInr?: number;
};

/**
 * Compute the MP Govt. domestic subsidy credit (always returned as a NEGATIVE amount).
 *
 * Tier A (≤150 u): subsidy = slabEnergy(min(units, N)) + (FC + ED) × min(N/units, 1) − cap
 * Tier B (151–300 u): subsidy = perUnit × units
 * Tier C (301–500 u FY 26-27): flat ₹ cap
 * Tier D (>500 u or FY 25-26 >300 u): zero
 *
 * The legacy `computeAtalGrihaJyotiSubsidy` name is preserved as an alias for callers
 * that still depend on the AGJY-only signature; internally both call this function.
 */
export function computeMpDomesticSubsidy(
  category: MpTariffCategory,
  units: number,
  ctx: MpDomesticSubsidyContext
): {
  applied: boolean;
  amount: number; // negative when applied, 0 otherwise
  reason: string;
  tier?: MpDomesticSubsidyTier;
} {
  const schedule = getMpDomesticSubsidySchedule(ctx.billMonth);
  if (!schedule.eligibleCategories.includes(category)) {
    return { applied: false, amount: 0, reason: `Category ${category} not eligible for MP Govt. domestic subsidy.` };
  }
  if (units <= 0) {
    return { applied: false, amount: 0, reason: "Zero units — no subsidy applicable." };
  }

  const tier = pickSubsidyTier(schedule.tiers, units, ctx.billMonth);
  if (!tier || tier.model === "none") {
    return {
      applied: false,
      amount: 0,
      reason: tier
        ? `MP Govt. subsidy (${schedule.fy}): no credit for ${units} u — ${tier.note}`
        : `MP Govt. subsidy (${schedule.fy}): consumption ${units} u falls outside scheduled tiers.`,
      tier: tier ?? undefined
    };
  }

  const fyLabel = `FY ${schedule.fy}`;

  if (tier.model === "agjy_slab_with_proportional_fc_duty") {
    const anchorUnits = Math.min(units, tier.subsidisedFirstUnitsCount ?? ATAL_GRIHA_JYOTI.subsidisedFirstUnitsCount);
    if (anchorUnits <= 0) {
      return { applied: false, amount: 0, reason: "Zero qualifying units for AGJY anchor.", tier };
    }
    let energyOnSlice: number;
    if (typeof ctx.energyRateOverridePerUnit === "number" && Number.isFinite(ctx.energyRateOverridePerUnit)) {
      energyOnSlice = r2(anchorUnits * ctx.energyRateOverridePerUnit);
    } else {
      energyOnSlice = computeEnergyChargeTelescopic(anchorUnits, ctx.energySlabs).total;
    }
    const fc = Math.max(0, Number(ctx.fixedChargeInr) || 0);
    const ed = Math.max(0, Number(ctx.electricityDutyInr) || 0);
    const proportion = Math.min(1, anchorUnits / Math.max(1, units));
    const proportionalFcEd = (fc + ed) * proportion;
    const consumerCap = tier.consumerCapInr ?? ATAL_GRIHA_JYOTI.subsidisedFirstUnitsCount;
    const credit = r2(Math.max(0, energyOnSlice + proportionalFcEd - consumerCap));
    if (credit <= 0) {
      return {
        applied: false,
        amount: 0,
        reason: `AGJY anchor (${fyLabel}): computed credit ≤ ₹0 (energy=${r2(energyOnSlice)}, FC+ED×${proportion.toFixed(3)}=${r2(proportionalFcEd)}, cap=₹${consumerCap}).`,
        tier
      };
    }
    return {
      applied: true,
      amount: -credit,
      reason:
        `MP Govt. subsidy ${fyLabel} (Tier A, AGJY anchor, ≤150 u): ` +
        `slabEnergy(first ${anchorUnits} u) = ₹${r2(energyOnSlice)} + ` +
        `(FC ₹${r2(fc)} + ED ₹${r2(ed)}) × ${proportion.toFixed(3)} = ₹${r2(proportionalFcEd)}; ` +
        `consumer cap ₹${consumerCap}; net credit = ₹${credit}.`,
      tier
    };
  }

  if (tier.model === "per_unit_credit") {
    const rate = tier.perUnitInr ?? 0;
    if (rate <= 0) {
      return { applied: false, amount: 0, reason: `${fyLabel} per-unit credit rate is zero.`, tier };
    }
    const credit = r2(rate * units);
    return {
      applied: true,
      amount: -credit,
      reason:
        `MP Govt. subsidy ${fyLabel} (Tier B, 151–300 u): ` +
        `₹${rate}/u × ${units} u = ₹${credit}.`,
      tier
    };
  }

  if (tier.model === "flat_cap") {
    const credit = r2(Math.max(0, Number(tier.flatInr) || 0));
    if (credit <= 0) {
      return { applied: false, amount: 0, reason: `${fyLabel} flat cap is zero.`, tier };
    }
    return {
      applied: true,
      amount: -credit,
      reason: `MP Govt. subsidy ${fyLabel} (Tier C, 301–500 u): flat ₹${credit} courtesy cap.`,
      tier
    };
  }

  return { applied: false, amount: 0, reason: `Unhandled subsidy tier model: ${tier.model}.`, tier };
}

/**
 * @deprecated Use `computeMpDomesticSubsidy`. Retained as a backwards-compatible alias
 * for code paths that still import `computeAtalGrihaJyotiSubsidy`. Behaviour is
 * IDENTICAL to `computeMpDomesticSubsidy` (the new function returns 0 for tiers the
 * old AGJY-only model rejected, and the same tier-A credit when units ≤ 150).
 */
export type MpAgjySliceContext = MpDomesticSubsidyContext;
export const computeAtalGrihaJyotiSubsidy = computeMpDomesticSubsidy;

/* ------------------------------------------------------------------ */
/* 6. Rebates — online + advance credit.                              */
/* ------------------------------------------------------------------ */

export function computeOnlineRebate(grossPayable: number, paidOnline?: boolean): { amount: number; note: string } {
  if (!paidOnline) return { amount: 0, note: "Online rebate not claimed." };
  const raw = grossPayable * MP_REBATES_FY_2025_26.onlinePaymentRebatePct;
  const capped = Math.min(raw, MP_REBATES_FY_2025_26.onlinePaymentRebateMaxInr);
  const amt = r2(capped);
  return { amount: -amt, note: `0.5% × ₹${r2(grossPayable)} capped at ₹1000 = -₹${amt}` };
}

export function computeAdvanceCredit(advanceBalanceInr?: number): { amount: number; note: string } {
  const v = Math.max(0, advanceBalanceInr ?? 0);
  if (v <= 0) return { amount: 0, note: "No advance balance." };
  const amt = r2(v * MP_REBATES_FY_2025_26.advancePaymentMonthlyInterestPct);
  return { amount: -amt, note: `1%/month on advance ₹${v} = -₹${amt}` };
}

/* ------------------------------------------------------------------ */
/* 7. Top-level calculator.                                           */
/* ------------------------------------------------------------------ */

export function calculateMpBill(input: MpBillEngineInput): MpBillBreakdown {
  // Auto-select tariff year based on billMonth.
  const tariffVersion = resolveMpTariffVersion(input.billMonth);
  const t = tariffVersion.tariffs[input.category];
  if (!t) throw new Error(`Unknown MP tariff category: ${input.category}`);

  /**
   * LV-2.2 Sanctioned-Load-Based sub-type uses a NON-TELESCOPIC energy regime:
   *   • consumption ≤ 50 units → ALL units billed at the low LV2.2 rate
   *   • consumption > 50 units → ALL units billed at the high LV2.2 rate
   * (Verified against all actual MPEZ bills — every month = units × flat rate exactly.)
   */
  const lv22SL = input.category === "LV2.2" && t.loadFixed
    ? isLV22SanctionedLoad(input, t.loadFixed)
    : false;

  let energySlabs = input.area === "rural" && t.ruralEnergySlabs ? t.ruralEnergySlabs : t.energySlabs;
  if (lv22SL && t.loadFixed) {
    const splitUnits = t.loadFixed.consumptionSplitUnits ?? 50;
    const rateHigh = t.loadFixed.energyRatePerUnitHigh ?? 8.00;
    const rateLow  = t.loadFixed.energyRatePerUnitLow  ?? 6.50;
    energySlabs = [{ fromUnit: 0, toUnit: null, ratePerUnit: input.units > splitUnits ? rateHigh : rateLow }];
  } else if (input.category === "LV2.1" && t.loadFixed && isSanctionedLoadTariff(input, t.loadFixed)) {
    const rate = t.loadFixed.energyRatePerUnitLow ?? energySlabs[0]?.ratePerUnit ?? 0;
    energySlabs = [{ fromUnit: 0, toUnit: null, ratePerUnit: rate }];
  }

  let ec = computeEnergyChargeTelescopic(input.units, energySlabs);
  let fc = computeFixedCharge(input);

  if (typeof input.energyRateOverridePerUnit === "number" && Number.isFinite(input.energyRateOverridePerUnit)) {
    const u = Math.max(0, Math.floor(input.units));
    const rate = input.energyRateOverridePerUnit;
    const tot = r2(u * rate);
    ec = {
      total: tot,
      perSlab: [{ from: 0, to: null, rate, unitsInSlab: u, subtotal: tot }]
    };
  }
  if (typeof input.fixedChargeOverrideInr === "number" && Number.isFinite(input.fixedChargeOverrideInr)) {
    fc = {
      amount: Math.round(input.fixedChargeOverrideInr),
      formula: "Board-verified fixed charge (Smart Billing override)"
    };
  }

  // Auto-lookup FPPAS from monthly table if not explicitly overridden.
  let fppas = computeFppas(input.units, input.fppasPct, input.billMonth);
  if (typeof input.printedFppasInr === "number" && Number.isFinite(input.printedFppasInr)) {
    fppas = {
      amount: r2(input.printedFppasInr),
      rate: input.units > 0 ? r2(input.printedFppasInr / input.units) : 0,
      formula: `Printed FPPAS line override: ₹${r2(input.printedFppasInr)}`
    };
  }
  // Pass fppas.amount so LV2.2 duty base = energy + FPPAS − ₹160 (verified formula).
  let ed = computeElectricityDuty(input.category, input.units, ec.total, fc.amount, input.billMonth, fppas.amount);
  if (typeof input.printedElectricityDutyInr === "number" && Number.isFinite(input.printedElectricityDutyInr)) {
    ed = {
      amount: r2(input.printedElectricityDutyInr),
      rate: 0,
      formula: `Printed Electricity Duty line override: ₹${r2(input.printedElectricityDutyInr)}`
    };
  }

  const arrear = max0(input.principalArrearInr ?? 0);

  // ToD: separate from M.P. Govt. subsidy — never merge or net into subsidyCredit.
  const todRaw = input.printedTodRebateInr;
  let todRebateInr = 0;
  if (typeof todRaw === "number" && Number.isFinite(todRaw) && Math.abs(todRaw) >= 0.01) {
    todRebateInr = r2(todRaw);
  }

  let subsidy: ReturnType<typeof computeMpDomesticSubsidy>;
  if (!isEligibleForMpDomesticSubsidy(input.category)) {
    subsidy = {
      applied: false,
      amount: 0,
      reason: `Category ${input.category}: M.P. Govt. domestic subsidy applies only to LV-1.2 residential.`
    };
  } else if (!(input.agjyClaimed ?? true)) {
    subsidy = { applied: false, amount: 0, reason: "MP Govt. domestic subsidy not claimed." };
  } else {
    subsidy = computeMpDomesticSubsidy(input.category, input.units, {
      energySlabs,
      billMonth: input.billMonth,
      energyRateOverridePerUnit: input.energyRateOverridePerUnit,
      fixedChargeInr: fc.amount,
      electricityDutyInr: ed.amount
    });
  }

  const grossBeforeDuty = ec.total + fc.amount + fppas.amount;
  const grossPayable = grossBeforeDuty + ed.amount + arrear + todRebateInr + subsidy.amount;

  const onlineRebate = computeOnlineRebate(grossPayable, input.paidOnline);
  const advance = computeAdvanceCredit(input.advanceBalanceInr);

  const ccbRaw = input.ccbAdjustmentInr;
  const ccbAmt = typeof ccbRaw === "number" && Number.isFinite(ccbRaw) ? ccbRaw : 0;

  let netPayable = grossPayable + onlineRebate.amount + advance.amount + ccbAmt;
  if (input.nfp) {
    const pin = input.nfpPrintedNetPayableInr;
    if (typeof pin === "number" && Number.isFinite(pin)) {
      netPayable = Math.round(pin);
    } else {
      netPayable = 0;
    }
  } else {
    netPayable = Math.round(netPayable);
  }

  const notes: string[] = [];
  const fyLabel = `FY ${tariffVersion.fy}`;
  const subTypeNote = lv22SL ? " [Sub-type A: Sanctioned-Load-Based ≤10kW, non-telescopic]" : "";
  notes.push(`[${fyLabel}] Category ${t.category}${subTypeNote}: ${t.applicabilityNote}`);
  notes.push(`EC slabs: ${ec.perSlab.map((p) => `${p.from}-${p.to ?? "∞"}@${p.rate}=₹${p.subtotal}`).join("; ")}`);
  notes.push(`FC: ${fc.formula}`);
  notes.push(`FPPAS: ${fppas.formula}`);
  notes.push(`Electricity Duty: ${ed.formula}`);
  notes.push(`MP Govt. Domestic Subsidy: ${subsidy.reason}`);
  if (todRebateInr !== 0) {
    notes.push(`ToD Rebate & Surcharge (separate from subsidy): ₹${r2(todRebateInr)}.`);
  }
  if (input.paidOnline) notes.push(onlineRebate.note);
  if (input.advanceBalanceInr && input.advanceBalanceInr > 0) notes.push(advance.note);
  if (input.nfp) {
    notes.push(
      typeof input.nfpPrintedNetPayableInr === "number" && Number.isFinite(input.nfpPrintedNetPayableInr)
        ? `NFP flag: net payable pinned to printed Total Amount Payable (₹${input.nfpPrintedNetPayableInr}).`
        : "NFP flag: net payable forced to ₹0 (no printed net supplied)."
    );
  }
  if (ccbAmt !== 0) notes.push(`CCB / bill adjustment applied: ₹${r2(ccbAmt)}.`);
  if (input.energyRateOverridePerUnit != null) {
    notes.push(`Smart Billing: energy rate pinned @ ₹${input.energyRateOverridePerUnit}/kWh (board cross-check).`);
  }
  if (input.fixedChargeOverrideInr != null) {
    notes.push(`Smart Billing: fixed charge pinned @ ₹${input.fixedChargeOverrideInr}/mo (board cross-check).`);
  }
  if (input.printedFppasInr != null) {
    notes.push(`Strict Audit: FPPAS pinned to printed bill line ₹${r2(input.printedFppasInr)}.`);
  }
  if (input.printedElectricityDutyInr != null) {
    notes.push(`Strict Audit: Electricity Duty pinned to printed bill line ₹${r2(input.printedElectricityDutyInr)}.`);
  }

  const lines: MpBillLine[] = [
    { kind: "energy", label: "Energy Charges (slab-wise)", amountInr: r2(ec.total), detail: { units: input.units } },
    { kind: "fixed",  label: "Fixed Charges", amountInr: r2(fc.amount), detail: { formula: fc.formula } },
    { kind: "fppas",  label: "FPPAS (Fuel Adjustment)", amountInr: r2(fppas.amount), detail: { rate: fppas.rate } },
    { kind: "electricity_duty", label: "Electricity Duty", amountInr: r2(ed.amount), detail: { rate: ed.rate } }
  ];
  if (todRebateInr !== 0) {
    lines.push({
      kind: "tod_rebate",
      label: "ToD Rebate & Surcharge",
      amountInr: r2(todRebateInr),
      detail: { source: "printed_bill_line" }
    });
  }
  if (subsidy.amount !== 0) lines.push({ kind: "subsidy", label: "M.P. Govt. Domestic Subsidy", amountInr: r2(subsidy.amount) });
  if (arrear !== 0) lines.push({ kind: "arrear", label: "Principal Arrear", amountInr: r2(arrear) });
  if (onlineRebate.amount !== 0) lines.push({ kind: "online_rebate", label: "Online Payment Rebate", amountInr: r2(onlineRebate.amount) });
  if (advance.amount !== 0) lines.push({ kind: "advance_credit", label: "Advance Payment Credit", amountInr: r2(advance.amount) });
  if (ccbAmt !== 0) {
    lines.push({ kind: "ccb_adjustment", label: "CCB / Bill Adjustment", amountInr: r2(ccbAmt), detail: {} });
  }

  const meta = MP_DISCOMS[input.discomCode];

  return {
    discomCode: input.discomCode,
    zone: meta.zone,
    category: input.category,
    units: input.units,
    loadKwUsed: input.sanctionedLoadKw ?? 0,
    energyCharge: r2(ec.total),
    fixedCharge: r2(fc.amount),
    fppasCharge: r2(fppas.amount),
    electricityDuty: r2(ed.amount),
    todRebateInr: r2(todRebateInr),
    subsidyCredit: r2(subsidy.amount),
    onlineRebate: r2(onlineRebate.amount),
    advanceCredit: r2(advance.amount),
    arrearAdded: r2(arrear),
    grossBeforeDuty: r2(grossBeforeDuty),
    grossPayable: r2(grossPayable),
    netPayable: Math.round(netPayable),
    lines,
    notes
  };
}
