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
 *   electricityDuty = (energyCharge + fppas − 160) × dutyRate   for LV2.2 (₹160 exemption, verified from 12 MPEZ bills)
 *                  = (energyCharge + fixedCharge) × dutyRate   for all other categories
 *   subsidy        = − Atal Griha Jyoti credit (LV-1.2 only, NO consumption cap)
 *   onlineRebate   = − min(0.5% × grossPayable, ₹1000) when paid online
 *   advanceCredit  = − manually-supplied advance interest (1%/month)
 *   netPayable     = energy + fixed + fppas + duty + extras − rebates − subsidy + CCB
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
  MP_TARIFF_FY_2025_26,
  getFppasForBillMonth,
  type CategoryTariff,
  type EnergySlab,
  type MpAreaProfile,
  type MpDiscomCode,
  type MpDiscomMeta,
  type MpPhase,
  type MpTariffCategory
} from "@/lib/mp-tariff-2025-26";
import { MP_TARIFF_FY_2026_27, isFY2026_27OrLater } from "@/lib/mp-tariff-2026-27";
import { getMpCategoryTariff, getMpElectricityDutyRule, resolveMpTariffVersion } from "@/lib/mp-tariff-registry";

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
};

export type MpBillLineKind =
  | "energy"
  | "fixed"
  | "fppas"
  | "electricity_duty"
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
    const amt = Math.round(loadKw * perKw);
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
/* 3. Electricity Duty (% of energy+FPPAS−160 for LV2.2;             */
/*    % of energy+fixed for all other categories).                    */
/* ------------------------------------------------------------------ */

/**
 * LV2.2 electricity duty base deduction (₹/month).
 * Empirically verified against 12 actual MPEZ LV2.2 bills (N1905018349):
 *   ED = 15% × (energy + FPPAS − 160) gives ≤₹2 error every month.
 * For all other categories the duty base remains (energy + fixed).
 */
const LV22_DUTY_BASE_DEDUCTION_INR = 160;

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

  // LV2.2: duty base = energy + FPPAS − ₹160 (verified against 12 MPEZ bills)
  const isLv22WithFppas = category === "LV2.2" && typeof fppasAmount === "number";
  const base = isLv22WithFppas
    ? energy + fppasAmount! - LV22_DUTY_BASE_DEDUCTION_INR
    : energy + fixed;

  const amt = r2(base * rate);
  const formulaBase = isLv22WithFppas
    ? `(EC ₹${r2(energy)} + FPPAS ₹${r2(fppasAmount!)} − ₹${LV22_DUTY_BASE_DEDUCTION_INR})`
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
/* 5. Atal Griha Jyoti — only LV-1.2, ≤150 units.                    */
/* ------------------------------------------------------------------ */

export function computeAtalGrihaJyotiSubsidy(category: MpTariffCategory, units: number, energy: number, billMonth?: string): {
  applied: boolean;
  amount: number; // negative
  reason: string;
} {
  if (!ATAL_GRIHA_JYOTI.eligibleCategories.includes(category)) {
    return { applied: false, amount: 0, reason: `Category ${category} is not AGJY-eligible.` };
  }
  // No consumption cap — IGJY applies for ALL LV-1.2 consumers every month.
  if (units <= 0) return { applied: false, amount: 0, reason: "Zero units — AGJY not applicable." };

  // First 100 units at ₹1/unit, state pays the difference at slab energy rates.
  const subsidisedUnits = Math.min(units, ATAL_GRIHA_JYOTI.subsidisedFirstUnitsCount);
  if (subsidisedUnits <= 0) return { applied: false, amount: 0, reason: "Zero qualifying units." };

  // Use correct tariff year's energy slabs for the subsidy calculation.
  const useFY2627 = isFY2026_27OrLater(billMonth);
  const tariffSlabs = useFY2627
    ? MP_TARIFF_FY_2026_27[category].energySlabs
    : MP_TARIFF_FY_2025_26[category].energySlabs;

  let energyOnFirst100 = 0;
  let remaining = subsidisedUnits;
  for (const s of tariffSlabs) {
    const segLow = s.fromUnit <= 0 ? 1 : s.fromUnit;
    const segHigh = s.toUnit ?? Infinity;
    if (remaining <= 0) break;
    if (subsidisedUnits < segLow) break;
    const take = Math.min(remaining, segHigh - segLow + 1);
    energyOnFirst100 += take * s.ratePerUnit;
    remaining -= take;
  }
  const consumerPays = subsidisedUnits * ATAL_GRIHA_JYOTI.consumerCappedRatePerUnit;
  const subsidy = r2(energyOnFirst100 - consumerPays);
  const fyLabel = useFY2627 ? "FY 2026-27" : "FY 2025-26";
  const reason =
    `AGJY (${fyLabel}) applies on first ${subsidisedUnits} u (no cap). ` +
    `Slab energy = ₹${r2(energyOnFirst100)}; consumer cap @ ₹${ATAL_GRIHA_JYOTI.consumerCappedRatePerUnit}/u = ₹${r2(consumerPays)}; ` +
    `state subsidy credit = ₹${subsidy}.`;

  void energy;
  return { applied: true, amount: -subsidy, reason };
}

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

  const subsidy = input.agjyClaimed
    ? computeAtalGrihaJyotiSubsidy(input.category, input.units, ec.total, input.billMonth)
    : { applied: false, amount: 0, reason: "AGJY not claimed." };

  const arrear = max0(input.principalArrearInr ?? 0);
  const grossBeforeDuty = ec.total + fc.amount + fppas.amount;
  const grossPayable = grossBeforeDuty + ed.amount + arrear + subsidy.amount;

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
  notes.push(`Atal Griha Jyoti: ${subsidy.reason}`);
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
  if (subsidy.amount !== 0) lines.push({ kind: "subsidy", label: "Atal Griha Jyoti Subsidy", amountInr: r2(subsidy.amount) });
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
