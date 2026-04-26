/**
 * Sol.52 — Madhya Pradesh Bill Calculation Engine (FY 2025-26)
 *
 * Pure-functional, deterministic, fully unit-testable.
 * All public functions return their *components* so the audit layer can
 * compare every line individually against a real bill ("explain why").
 *
 * Telescopic, slab-wise correct math:
 *
 *   energyCharge   = Σ over slabs[]   ((min(units,toUnit) − fromUnit + 1) × ratePerUnit)
 *                                              clamped at 0 below the slab floor
 *   fixedCharge    = MPERC LV-* fixed-charge rule (FC may be slab- or kW-driven)
 *   fppasCharge    = energyCharge × fppasPct   (signed; negative reduces bill)
 *   electricityDuty = (energyCharge + fixedCharge) × dutyRate   (rate from §ED rule)
 *   subsidy        = − Atal Griha Jyoti credit (only when LV-1.2 + units ≤ 150)
 *   onlineRebate   = − min(0.5% × grossPayable, ₹1000) when paid online
 *   advanceCredit  = − manually-supplied advance interest (1%/month)
 *   netPayable     = max(0, energy + fixed + fppas + duty + extras − rebates − subsidy)
 */

import {
  ATAL_GRIHA_JYOTI,
  MP_DISCOMS,
  MP_ELECTRICITY_DUTY_FY_2025_26,
  MP_FPPAS_DEFAULT_PCT,
  MP_REBATES_FY_2025_26,
  MP_TARIFF_FY_2025_26,
  type CategoryTariff,
  type EnergySlab,
  type MpAreaProfile,
  type MpDiscomCode,
  type MpDiscomMeta,
  type MpPhase,
  type MpTariffCategory
} from "@/lib/mp-tariff-2025-26";

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
  /** Override FPPAS for this billing month (decimal, e.g. -0.0223). */
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
  const points = Math.max(1, Math.ceil(loadKw / 0.1)); // 0.1 kW step
  const amount = perPoint * points;
  return { amount, formula: `>150 units: ${points} × 0.1kW × ₹${perPoint} = ₹${amount}` };
}

function fixedLoadBased(input: MpBillEngineInput, t: CategoryTariff): { amount: number; formula: string } {
  const lf = t.loadFixed;
  if (!lf) return { amount: 0, formula: "no FC rule" };

  const area = input.area ?? "urban";
  const isRural = area === "rural";

  // LV-2.1 (consumption-split sanctioned-load model)
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

  // LV5.2 — unmetered: HP × per-HP rate (we stored that rate in perKwUrban)
  if (t.category === "LV5.2") {
    const hp = Math.max(0, input.unmeteredHorsepower ?? 0);
    const perHp = lf.perKwUrban ?? 0;
    const amt = Math.round(hp * perHp);
    return { amount: amt, formula: `LV5.2 unmetered: ${hp} HP × ₹${perHp}/HP = ₹${amt}` };
  }

  // Demand-based with kVA preference (LV2.2 / LV4)
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
  const t = MP_TARIFF_FY_2025_26[input.category];
  if (input.category === "LV1.1" || input.category === "LV1.2") {
    return fixedDomestic(input.units, input.area ?? "urban", input.sanctionedLoadKw ?? 1, t);
  }
  return fixedLoadBased(input, t);
}

/* ------------------------------------------------------------------ */
/* 3. Electricity Duty (% of energy + fixed, by slab bracket).        */
/* ------------------------------------------------------------------ */

export function computeElectricityDuty(category: MpTariffCategory, units: number, energy: number, fixed: number): {
  amount: number;
  rate: number;
  formula: string;
} {
  const rule = MP_ELECTRICITY_DUTY_FY_2025_26[category];
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

export function computeFppas(energy: number, fppasPct?: number): { amount: number; rate: number; formula: string } {
  const rate = typeof fppasPct === "number" && Number.isFinite(fppasPct) ? fppasPct : MP_FPPAS_DEFAULT_PCT;
  const amt = r2(energy * rate);
  return { amount: amt, rate, formula: `EC ₹${r2(energy)} × ${(rate * 100).toFixed(2)}% = ₹${amt}` };
}

/* ------------------------------------------------------------------ */
/* 5. Atal Griha Jyoti — only LV-1.2, ≤150 units.                    */
/* ------------------------------------------------------------------ */

export function computeAtalGrihaJyotiSubsidy(category: MpTariffCategory, units: number, energy: number): {
  applied: boolean;
  amount: number; // negative
  reason: string;
} {
  if (!ATAL_GRIHA_JYOTI.eligibleCategories.includes(category)) {
    return { applied: false, amount: 0, reason: `Category ${category} is not AGJY-eligible.` };
  }
  if (units > ATAL_GRIHA_JYOTI.monthlyEligibilityCapUnits) {
    return { applied: false, amount: 0, reason: `Consumption ${units} u > 150 u cap — AGJY forfeited this month.` };
  }
  // First 100 units at ₹1/unit, the state pays the difference at slab rates.
  const subsidisedUnits = Math.min(units, ATAL_GRIHA_JYOTI.subsidisedFirstUnitsCount);
  if (subsidisedUnits <= 0) return { applied: false, amount: 0, reason: "Zero qualifying units." };

  // Energy charge attributable to first 100 units (telescopic).
  const slabs = MP_TARIFF_FY_2025_26[category].energySlabs;
  let energyOnFirst100 = 0;
  let remaining = subsidisedUnits;
  for (const s of slabs) {
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
  const reason =
    `AGJY applies on first ${subsidisedUnits} u. Slab energy charge = ₹${r2(energyOnFirst100)}; ` +
    `consumer cap @ ₹${ATAL_GRIHA_JYOTI.consumerCappedRatePerUnit}/u = ₹${r2(consumerPays)}; ` +
    `state subsidy credit = ₹${subsidy}.`;

  // Avoid double-credit warning if `energy` arg is missing — just return computed.
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
  const t = MP_TARIFF_FY_2025_26[input.category];
  if (!t) throw new Error(`Unknown MP tariff category: ${input.category}`);

  const ec = computeEnergyChargeTelescopic(input.units, t.energySlabs);
  const fc = computeFixedCharge(input);
  const fppas = computeFppas(ec.total, input.fppasPct);
  const ed = computeElectricityDuty(input.category, input.units, ec.total, fc.amount);

  const subsidy = input.agjyClaimed
    ? computeAtalGrihaJyotiSubsidy(input.category, input.units, ec.total)
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
  notes.push(`Category ${t.category}: ${t.applicabilityNote}`);
  notes.push(`EC slabs: ${ec.perSlab.map((p) => `${p.from}-${p.to ?? "∞"}@${p.rate}=₹${p.subtotal}`).join("; ")}`);
  notes.push(`FC: ${fc.formula}`);
  notes.push(`FPPAS: ${fppas.formula}`);
  notes.push(`Electricity Duty: ${ed.formula}`);
  notes.push(`Atal Griha Jyoti: ${subsidy.reason}`);
  if (input.paidOnline) notes.push(onlineRebate.note);
  if (input.advanceBalanceInr && input.advanceBalanceInr > 0) notes.push(advance.note);
  if (input.nfp) notes.push("NFP flag: net payable forced to 0 even if gross > 0.");

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
