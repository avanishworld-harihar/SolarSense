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
 *                      LV1.2 >150u: min(ceil(units/15), ceil(sanctionedLoad/0.1)) blocks
 *                                   × ₹8.80/block (FY 2025-26) or ₹13.60/block (FY 2026-27)
 *                      ≤150u: fixed connection-based slab (₹76/₹129 urban)
 *   fppasCharge    = energyCharge × fppasPct   (always large and POSITIVE, ~30-37%)
 *                    Auto-looked up from MP_FPPAS_MONTHLY_RATES if billMonth provided
 *   electricityDuty = (energyCharge + fixedCharge) × dutyRate   (rate from §ED rule)
 *   subsidy        = − Atal Griha Jyoti credit (LV-1.2 only, NO consumption cap)
 *   onlineRebate   = − min(0.5% × grossPayable, ₹1000) when paid online
 *   advanceCredit  = − manually-supplied advance interest (1%/month)
 *   netPayable     = max(0, energy + fixed + fppas + duty + extras − rebates − subsidy)
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
  MP_ELECTRICITY_DUTY_FY_2025_26,
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
import {
  MP_ELECTRICITY_DUTY_FY_2026_27,
  MP_TARIFF_FY_2026_27,
  isFY2026_27OrLater
} from "@/lib/mp-tariff-2026-27";

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
   * Explicit FPPAS override for this billing month (decimal, e.g. 0.309 = 30.9%).
   * If omitted AND billMonth is set, the monthly table is consulted automatically.
   * FPPAS is always a large POSITIVE value (~0.297 to 0.373 for FY 2025-26).
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
   * Smart Billing: when printed Energy ÷ units proves the board applied a flat
   * ₹/kWh that diverges from our slab replica — pin that rate for projection.
   */
  energyRateOverridePerUnit?: number;
  /** Smart Billing: pin monthly fixed ₹ from a verified bill line. */
  fixedChargeOverrideInr?: number;
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
    if (u < slab.fromUnit) {
      perSlab.push({ from: slab.fromUnit, to: slab.toUnit, rate: slab.ratePerUnit, unitsInSlab: 0, subtotal: 0 });
      continue;
    }
    const ceil = slab.toUnit == null ? u : Math.min(u, slab.toUnit);
    const unitsInSlab = max0(ceil - slab.fromUnit + 1);
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
  // Consumption-based blocks: every 15 units = 1 block of 0.1 kW
  // Capped at sanctioned-load blocks so consumer can't exceed their contracted load.
  // This matches both the MPERC tariff order (consumption-based formula) and
  // the empirically verified APR-2026 behaviour (capped at SL for high consumption).
  const consumptionBlocks = Math.ceil(units / 15);
  const sanctionedBlocks = Math.max(1, Math.ceil(loadKw / 0.1));
  const points = Math.min(consumptionBlocks, sanctionedBlocks);
  const amount = r2(perPoint * points);
  return {
    amount,
    formula: `>150u: min(ceil(${units}/15)=${consumptionBlocks}, ceil(${loadKw}kW/0.1)=${sanctionedBlocks}) = ${points} blocks × ₹${perPoint} = ₹${amount}`
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

function fixedLoadBased(input: MpBillEngineInput, t: CategoryTariff): { amount: number; formula: string } {
  const lf = t.loadFixed;
  if (!lf) return { amount: 0, formula: "no FC rule" };

  const area = input.area ?? "urban";
  const isRural = area === "rural";

  // LV-2.1 (educational/hostels — consumption-split sanctioned-load model)
  if (t.category === "LV2.1" && lf.consumptionSplitUnits != null) {
    const loadKw = Math.max(1, input.sanctionedLoadKw ?? 1);
    const isHigh = (input.units ?? 0) > lf.consumptionSplitUnits;
    const perKw = isHigh
      ? (isRural ? lf.perKwRuralHigh ?? 0 : lf.perKwUrbanHigh ?? 0)
      : (isRural ? lf.perKwRuralLow ?? 0 : lf.perKwUrbanLow ?? 0);
    const amt = Math.round(loadKw * perKw);
    return {
      amount: amt,
      formula: `LV2.1 ${isHigh ? ">50u" : "≤50u"} ${area}: ${loadKw} kW × ₹${perKw} = ₹${amt}`
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
  const useFY2627 = isFY2026_27OrLater(input.billMonth);
  const t = useFY2627 ? MP_TARIFF_FY_2026_27[input.category] : MP_TARIFF_FY_2025_26[input.category];
  if (input.category === "LV1.1" || input.category === "LV1.2") {
    return fixedDomestic(input.units, input.area ?? "urban", input.sanctionedLoadKw ?? 1, t);
  }
  return fixedLoadBased(input, t);
}

/* ------------------------------------------------------------------ */
/* 3. Electricity Duty (% of energy + fixed, by slab bracket).        */
/* ------------------------------------------------------------------ */

export function computeElectricityDuty(category: MpTariffCategory, units: number, energy: number, fixed: number, billMonth?: string): {
  amount: number;
  rate: number;
  formula: string;
} {
  const useFY2627 = isFY2026_27OrLater(billMonth);
  const dutyTable = useFY2627 ? MP_ELECTRICITY_DUTY_FY_2026_27 : MP_ELECTRICITY_DUTY_FY_2025_26;
  const rule = dutyTable[category];
  let rate = 0;
  for (const b of rule.brackets) {
    if (b.untilUnits == null || units <= b.untilUnits) { rate = b.rate; break; }
  }
  const base = energy + fixed;
  const amt = r2(base * rate);
  return {
    amount: amt,
    rate,
    formula: `(EC ₹${r2(energy)} + FC ₹${r2(fixed)}) × ${(rate * 100).toFixed(1)}% = ₹${amt}`
  };
}

/* ------------------------------------------------------------------ */
/* 4. FPPAS — energy charge × monthly %                              */
/* ------------------------------------------------------------------ */

export function computeFppas(energy: number, fppasPct?: number, billMonth?: string): { amount: number; rate: number; formula: string } {
  let rate: number;
  if (typeof fppasPct === "number" && Number.isFinite(fppasPct)) {
    rate = fppasPct;
  } else if (billMonth) {
    rate = getFppasForBillMonth(billMonth);
  } else {
    rate = MP_FPPAS_DEFAULT_PCT;
  }
  const amt = r2(energy * rate);
  return { amount: amt, rate, formula: `EC ₹${r2(energy)} × ${(rate * 100).toFixed(2)}% = ₹${amt}` };
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
    const segLow = s.fromUnit;
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
  const useFY2627 = isFY2026_27OrLater(input.billMonth);
  const t = useFY2627
    ? MP_TARIFF_FY_2026_27[input.category]
    : MP_TARIFF_FY_2025_26[input.category];
  if (!t) throw new Error(`Unknown MP tariff category: ${input.category}`);

  /**
   * LV-2.2 Sanctioned-Load-Based sub-type uses a NON-TELESCOPIC energy regime:
   *   • consumption ≤ 50 units → ALL units billed at ₹6.50/unit
   *   • consumption > 50 units → ALL units billed at ₹8.00/unit
   * (Verified against all actual MPEZ bills — every month = units × flat rate exactly.)
   */
  const lv22SL = input.category === "LV2.2" && t.loadFixed
    ? isLV22SanctionedLoad(input, t.loadFixed)
    : false;

  let energySlabs = t.energySlabs;
  if (lv22SL && t.loadFixed) {
    const splitUnits = t.loadFixed.consumptionSplitUnits ?? 50;
    const rateHigh = t.loadFixed.energyRatePerUnitHigh ?? 8.00;
    const rateLow  = t.loadFixed.energyRatePerUnitLow  ?? 6.50;
    energySlabs = [{ fromUnit: 0, toUnit: null, ratePerUnit: input.units > splitUnits ? rateHigh : rateLow }];
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
  const fppas = computeFppas(ec.total, input.fppasPct, input.billMonth);
  const ed = computeElectricityDuty(input.category, input.units, ec.total, fc.amount, input.billMonth);

  const subsidy = input.agjyClaimed
    ? computeAtalGrihaJyotiSubsidy(input.category, input.units, ec.total, input.billMonth)
    : { applied: false, amount: 0, reason: "AGJY not claimed." };

  const arrear = max0(input.principalArrearInr ?? 0);
  const grossBeforeDuty = ec.total + fc.amount + fppas.amount;
  const grossPayable = grossBeforeDuty + ed.amount + arrear + subsidy.amount;

  const onlineRebate = computeOnlineRebate(grossPayable, input.paidOnline);
  const advance = computeAdvanceCredit(input.advanceBalanceInr);

  let netPayable = grossPayable + onlineRebate.amount + advance.amount;
  if (input.nfp) netPayable = 0;
  netPayable = Math.round(max0(netPayable));

  const notes: string[] = [];
  const fyLabel = useFY2627 ? "FY 2026-27" : "FY 2025-26";
  const subTypeNote = lv22SL ? " [Sub-type A: Sanctioned-Load-Based ≤10kW, non-telescopic]" : "";
  notes.push(`[${fyLabel}] Category ${t.category}${subTypeNote}: ${t.applicabilityNote}`);
  notes.push(`EC slabs: ${ec.perSlab.map((p) => `${p.from}-${p.to ?? "∞"}@${p.rate}=₹${p.subtotal}`).join("; ")}`);
  notes.push(`FC: ${fc.formula}`);
  notes.push(`FPPAS: ${fppas.formula}`);
  notes.push(`Electricity Duty: ${ed.formula}`);
  notes.push(`Atal Griha Jyoti: ${subsidy.reason}`);
  if (input.paidOnline) notes.push(onlineRebate.note);
  if (input.advanceBalanceInr && input.advanceBalanceInr > 0) notes.push(advance.note);
  if (input.nfp) notes.push("NFP flag: net payable forced to 0 even if gross > 0.");
  if (input.energyRateOverridePerUnit != null) {
    notes.push(`Smart Billing: energy rate pinned @ ₹${input.energyRateOverridePerUnit}/kWh (board cross-check).`);
  }
  if (input.fixedChargeOverrideInr != null) {
    notes.push(`Smart Billing: fixed charge pinned @ ₹${input.fixedChargeOverrideInr}/mo (board cross-check).`);
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
