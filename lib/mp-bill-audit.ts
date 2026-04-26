/**
 * Sol.52 — Madhya Pradesh Multi-Customer Bill Audit Engine
 *
 * Takes one parsed bill (from the existing AI scanner / Gemini / Claude path)
 * and produces a fully-explained audit report that:
 *
 *   1. IDENTIFIES   → DISCOM zone, LV category, sanctioned load, billing period.
 *   2. EXTRACTS     → Reconciles printed metered units vs consumption history.
 *   3. CALCULATES   → Re-runs the FY 2025-26 MPERC math through `mp-bill-engine`.
 *   4. VALIDATES    → Compares against the bill's `Net Amount`.
 *                     If |Δ| > ₹5 → produces a typed reason
 *                     (Arrears / Adjustment / Surcharge mismatch / etc.)
 *   5. EMITS JSON   → A Supabase-ready row for `mp_bill_audits` (see migration).
 */

import type { ParsedBillShape } from "@/lib/bill-parse";
import {
  calculateMpBill,
  type MpBillBreakdown,
  type MpBillEngineInput
} from "@/lib/mp-bill-engine";
import {
  MP_DISCOMS,
  detectMpDiscomFromAddress,
  normalizeTariffCategory,
  resolveMpDiscomFromHint,
  type MpAreaProfile,
  type MpDiscomCode,
  type MpDiscomMeta,
  type MpPhase,
  type MpTariffCategory
} from "@/lib/mp-tariff-2025-26";

const TOLERANCE_INR = 5;

export type MpAuditMatchStatus = "match" | "mismatch_low" | "mismatch_high";

export type MpAuditVarianceReason =
  | "arrears"
  | "adjustment_credit_or_debit"
  | "surcharge_mismatch"
  | "fppas_mismatch"
  | "duty_bracket_mismatch"
  | "agjy_subsidy_mismatch"
  | "fixed_charge_load_mismatch"
  | "telescopic_unit_mismatch"
  | "round_off_or_paise"
  | "nfp_flag"
  | "received_against_bill_offset"
  | "ocr_uncertain"
  | "no_variance";

export type MpBillAuditReport = {
  /** Hash-friendly id; can be used as audit_ref in Supabase. */
  auditRef: string;
  generatedAtIso: string;
  schemaVersion: "mp.audit/2025-26.v1";

  identification: {
    detectedState: "Madhya Pradesh" | string;
    detectedDiscom: MpDiscomCode;
    detectedZone: MpDiscomMeta["zone"];
    discomConfidence: number; // 0..1
    detectedCategory: MpTariffCategory;
    categoryConfidence: number;
    consumerId: string | null;
    meterNumber: string | null;
    connectionDate: string | null;
    sanctionedLoadKw: number | null;
    contractDemandKva: number | null;
    phase: MpPhase | null;
    area: MpAreaProfile;
    billingMonth: string | null;
    billingPeriodFromIso: string | null;
    billingPeriodToIso: string | null;
  };

  unitsExtraction: {
    meteredUnits: number | null;
    monthsHistoryUnits: number | null;
    chosenUnits: number;
    unitsSource:
      | "metered_unit_consumption"
      | "bill_month"
      | "consumption_history"
      | "months_average"
      | "manual_default";
    unitsConsistent: boolean;
    inconsistencyNote: string | null;
  };

  calculation: {
    breakdown: MpBillBreakdown;
    fppasUsedPct: number | null;
    agjyApplied: boolean;
  };

  printed: {
    energyChargeInr: number | null;
    fixedChargeInr: number | null;
    fppasInr: number | null;
    electricityDutyInr: number | null;
    subsidyInr: number | null;
    rebateIncentiveInr: number | null;
    arrearInr: number | null;
    receivedAgainstBillInr: number | null;
    currentMonthBillInr: number | null;
    totalAmountTillDueInr: number | null;
    totalAmountAfterDueInr: number | null;
    totalAmountPayableInr: number | null;
    nfp: boolean;
  };

  validation: {
    referenceField: "current_month_bill" | "total_amount_payable" | "total_amount_till_due";
    referenceInr: number;
    calculatedInr: number;
    deltaInr: number;
    deltaPct: number;
    status: MpAuditMatchStatus;
    primaryReason: MpAuditVarianceReason;
    reasonExplanations: string[];
  };

  riskFlags: string[];

  /** A friendly auditor narrative — useful for the UI / WhatsApp send-out. */
  narrativeMd: string;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const r2 = (n: number) => Math.round(n * 100) / 100;

function num(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw).replace(/,/g, "").replace(/[^\d.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseLoadKw(raw?: string | null): { kw: number | null; kva: number | null; phase: MpPhase | null } {
  if (!raw) return { kw: null, kva: null, phase: null };
  const s = String(raw).toLowerCase();
  const kw = (s.match(/(\d+(?:\.\d+)?)\s*kw/) ?? [])[1];
  const kva = (s.match(/(\d+(?:\.\d+)?)\s*kva/) ?? [])[1];
  const numeric = (s.match(/(\d+(?:\.\d+)?)/) ?? [])[1];
  const phase: MpPhase | null = /three|3\s*ph|3-?phase|3-?ø/.test(s)
    ? "three"
    : /single|1\s*ph|1-?phase|1-?ø/.test(s)
      ? "single"
      : null;
  return {
    kw: kw ? Number(kw) : kva || phase ? null : numeric ? Number(numeric) : null,
    kva: kva ? Number(kva) : null,
    phase
  };
}

function parseBillMonthRange(label?: string | null): { fromIso: string | null; toIso: string | null } {
  // We currently only have month label (e.g. "Mar 2026"). We approximate as
  // first day of month → last day of month so callers can still bin by period.
  if (!label) return { fromIso: null, toIso: null };
  const s = label.trim();
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const monthIdx = months.findIndex((m) => s.toLowerCase().startsWith(m));
  const yearMatch = s.match(/(20\d{2})/);
  if (monthIdx === -1 || !yearMatch) return { fromIso: null, toIso: null };
  const y = Number(yearMatch[1]);
  const start = new Date(Date.UTC(y, monthIdx, 1));
  const end = new Date(Date.UTC(y, monthIdx + 1, 0));
  return { fromIso: start.toISOString().slice(0, 10), toIso: end.toISOString().slice(0, 10) };
}

function detectAreaProfile(parsed: ParsedBillShape): MpAreaProfile {
  const text = `${parsed.address ?? ""} ${parsed.tariff_category ?? ""} ${parsed.connection_type ?? ""}`.toLowerCase();
  if (/rural|gram|panchayat|gp\b/.test(text)) return "rural";
  return "urban";
}

function pickReferenceAmount(parsed: ParsedBillShape): { ref: number; field: "current_month_bill" | "total_amount_payable" | "total_amount_till_due" } | null {
  const cur = num(parsed.current_month_bill_amount_inr);
  if (cur != null && cur > 0) return { ref: cur, field: "current_month_bill" };
  const due = num(parsed.total_amount_till_due_inr);
  if (due != null && due > 0) return { ref: due, field: "total_amount_till_due" };
  const pay = num(parsed.total_amount_payable_inr);
  if (pay != null && pay > 0) return { ref: pay, field: "total_amount_payable" };
  return null;
}

function chooseUnits(parsed: ParsedBillShape): {
  meteredUnits: number | null;
  monthsHistoryUnits: number | null;
  chosen: number;
  source:
    | "metered_unit_consumption"
    | "bill_month"
    | "consumption_history"
    | "months_average"
    | "manual_default";
  consistent: boolean;
  note: string | null;
} {
  const metered = num(parsed.metered_unit_consumption);
  const monthVals = Object.values(parsed.months ?? {})
    .map(num)
    .filter((v): v is number => v != null && v > 0);
  const histVals = (parsed.consumption_history ?? []).map((r) => num(r.units)).filter((v): v is number => v != null && v > 0);
  const billMonthVal = (() => {
    const key = (parsed.bill_month ?? "").toLowerCase().match(/[a-z]+/)?.[0]?.slice(0, 3) as keyof NonNullable<ParsedBillShape["months"]> | undefined;
    if (!key || !parsed.months) return null;
    return num((parsed.months as Record<string, unknown>)[key]);
  })();

  // Order of preference + cross-check.
  let chosen = 0;
  let source: ReturnType<typeof chooseUnits>["source"] = "manual_default";
  if (metered != null && metered > 0) { chosen = Math.round(metered); source = "metered_unit_consumption"; }
  else if (billMonthVal != null && billMonthVal > 0) { chosen = Math.round(billMonthVal); source = "bill_month"; }
  else if (histVals.length > 0) { chosen = Math.round(histVals[0]); source = "consumption_history"; }
  else if (monthVals.length > 0) { chosen = Math.round(monthVals.reduce((a,b)=>a+b,0) / monthVals.length); source = "months_average"; }

  let consistent = true;
  let note: string | null = null;
  if (metered != null && billMonthVal != null) {
    const diff = Math.abs(metered - billMonthVal);
    if (diff > Math.max(2, metered * 0.05)) {
      consistent = false;
      note = `Metered unit (${metered}) and bill-month value (${billMonthVal}) differ by ${diff} units (>5%).`;
    }
  }

  return {
    meteredUnits: metered,
    monthsHistoryUnits: histVals[0] ?? null,
    chosen,
    source,
    consistent,
    note
  };
}

function detectDiscom(parsed: ParsedBillShape): { code: MpDiscomCode; confidence: number } {
  const fromHint = resolveMpDiscomFromHint(parsed.discom ?? "");
  if (fromHint) return { code: fromHint.code, confidence: 0.95 };
  const fromAddr = detectMpDiscomFromAddress(parsed.address);
  if (fromAddr) return { code: fromAddr.code, confidence: 0.7 };
  return { code: "MPMKVVCL", confidence: 0.3 };
}

function detectCategory(parsed: ParsedBillShape): { cat: MpTariffCategory; confidence: number } {
  const norm = normalizeTariffCategory(parsed.tariff_category);
  if (norm) return { cat: norm, confidence: 0.9 };
  const conn = (parsed.connection_type ?? "").toLowerCase();
  if (/agri|kisan|pump/.test(conn)) return { cat: "LV5.1", confidence: 0.7 };
  if (/indus|industrial|workshop|manufact/.test(conn)) return { cat: "LV4", confidence: 0.7 };
  if (/comm|shop|non-?domestic/.test(conn)) return { cat: "LV2.1", confidence: 0.65 };
  return { cat: "LV1.2", confidence: 0.55 };
}

/* ------------------------------------------------------------------ */
/* Variance reasoning                                                 */
/* ------------------------------------------------------------------ */

function classifyVariance(args: {
  delta: number;
  deltaAbs: number;
  parsed: ParsedBillShape;
  breakdown: MpBillBreakdown;
}): { reason: MpBillAuditReport["validation"]["primaryReason"]; explanations: string[] } {
  const { delta, deltaAbs, parsed, breakdown } = args;
  const explanations: string[] = [];

  if (deltaAbs <= TOLERANCE_INR) {
    return { reason: "no_variance", explanations: ["Calculated bill matches printed amount within ₹5 tolerance."] };
  }
  if (parsed.nfp_flag) {
    explanations.push("Bill is marked NFP (Not For Payment); printed amount may be 0 even if charges accrued.");
    return { reason: "nfp_flag", explanations };
  }
  const arrear = num(parsed.principal_arrear_inr);
  if (arrear != null && Math.abs(arrear - delta) <= 25) {
    explanations.push(`Variance ≈ printed Principal Arrear (₹${r2(arrear)}). Likely engine excluded arrears in baseline run.`);
    return { reason: "arrears", explanations };
  }
  const received = num(parsed.amount_received_against_bill_inr);
  if (received != null && Math.abs(received + delta) <= 25) {
    explanations.push(`Variance ≈ printed "Amount Received Against Bill" (₹${r2(received)}). Net payable shown is post-payment offset.`);
    return { reason: "received_against_bill_offset", explanations };
  }
  const printedFppas = num(parsed.fppas_inr);
  if (printedFppas != null && Math.abs(printedFppas - breakdown.fppasCharge) > Math.max(2, deltaAbs * 0.5)) {
    explanations.push(
      `FPPAS mismatch: printed ₹${r2(printedFppas)} vs calculated ₹${breakdown.fppasCharge}. ` +
      `Likely the published month has a different surcharge % than our default.`
    );
    return { reason: "fppas_mismatch", explanations };
  }
  const printedFc = num(parsed.fixed_charges_inr);
  if (printedFc != null && Math.abs(printedFc - breakdown.fixedCharge) > Math.max(5, deltaAbs * 0.4)) {
    explanations.push(
      `Fixed-charge mismatch: printed ₹${r2(printedFc)} vs calculated ₹${breakdown.fixedCharge}. ` +
      `Cross-check sanctioned load / area (urban vs rural) used by the engine.`
    );
    return { reason: "fixed_charge_load_mismatch", explanations };
  }
  const printedEc = num(parsed.energy_charges_inr);
  if (printedEc != null && Math.abs(printedEc - breakdown.energyCharge) > Math.max(5, deltaAbs * 0.4)) {
    explanations.push(
      `Energy-charge mismatch: printed ₹${r2(printedEc)} vs calculated ₹${breakdown.energyCharge}. ` +
      `Likely metered units differ from telescopic-unit assumption (verify slab boundary 50/150/300).`
    );
    return { reason: "telescopic_unit_mismatch", explanations };
  }
  const printedSubsidy = num(parsed.mp_govt_subsidy_amount_inr);
  if (printedSubsidy != null && Math.abs(Math.abs(printedSubsidy) - Math.abs(breakdown.subsidyCredit)) > Math.max(5, deltaAbs * 0.4)) {
    explanations.push(
      `Atal Griha Jyoti subsidy mismatch: printed ₹${r2(printedSubsidy)} vs calculated ₹${breakdown.subsidyCredit}. ` +
      `Re-check eligibility (units ≤ 150) and claimed flag.`
    );
    return { reason: "agjy_subsidy_mismatch", explanations };
  }
  const printedDuty = num(parsed.fppas_inr); // some bills bundle ED into "Other Charges"
  if (printedDuty != null && deltaAbs > 50 && Math.abs(printedDuty - breakdown.electricityDuty) > 5) {
    explanations.push(
      `Possible Electricity Duty bracket mismatch — engine used the ${breakdown.units}-unit bracket; ` +
      `verify whether DISCOM applied the higher/lower-units bracket for this category.`
    );
    return { reason: "duty_bracket_mismatch", explanations };
  }

  if (deltaAbs <= 50) {
    explanations.push("Small variance — likely paise rounding, surcharge tweak, or meter rent line we did not detect.");
    return { reason: "round_off_or_paise", explanations };
  }
  explanations.push("Unclassified variance > ₹50 — recommend manual review.");
  return { reason: "adjustment_credit_or_debit", explanations };
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

export type MpBillAuditOptions = {
  /** Override FPPAS for the bill's month (e.g. -0.0223 for Nov 2025). */
  fppasPct?: number;
  /** Force the audit to assume online payment rebate was claimed. */
  paidOnline?: boolean;
  /** Optional auditor-supplied advance balance carried into this bill. */
  advanceBalanceInr?: number;
  /** Optional auditor override for sanctioned load (kW). */
  sanctionedLoadKwOverride?: number;
};

function makeAuditRef(parsed: ParsedBillShape): string {
  const c = (parsed.consumer_id ?? "anon").replace(/\W+/g, "");
  const m = (parsed.bill_month ?? "").replace(/\W+/g, "");
  return `mp-audit-${c}-${m}-${Date.now().toString(36)}`;
}

export function auditMpBill(parsed: ParsedBillShape, options?: MpBillAuditOptions): MpBillAuditReport {
  const { code: discomCode, confidence: discomConfidence } = detectDiscom(parsed);
  const { cat: category, confidence: categoryConfidence } = detectCategory(parsed);
  const meta = MP_DISCOMS[discomCode];

  const loadParsed = parseLoadKw(parsed.sanctioned_load);
  const sanctionedLoadKw = options?.sanctionedLoadKwOverride ?? loadParsed.kw ?? (category === "LV1.2" ? 1 : null);

  const area = detectAreaProfile(parsed);
  const period = parseBillMonthRange(parsed.bill_month);
  const units = chooseUnits(parsed);

  const engineInput: MpBillEngineInput = {
    discomCode,
    category,
    units: units.chosen,
    sanctionedLoadKw: sanctionedLoadKw ?? undefined,
    contractDemandKva: loadParsed.kva ?? undefined,
    phase: loadParsed.phase ?? undefined,
    area,
    fppasPct: options?.fppasPct,
    agjyClaimed: num(parsed.mp_govt_subsidy_amount_inr) != null && (num(parsed.mp_govt_subsidy_amount_inr) ?? 0) !== 0,
    advanceBalanceInr: options?.advanceBalanceInr,
    paidOnline: options?.paidOnline,
    principalArrearInr: num(parsed.principal_arrear_inr) ?? 0,
    nfp: Boolean(parsed.nfp_flag)
  };

  const breakdown = calculateMpBill(engineInput);

  const printed = {
    energyChargeInr: num(parsed.energy_charges_inr),
    fixedChargeInr: num(parsed.fixed_charges_inr),
    fppasInr: num(parsed.fppas_inr),
    electricityDutyInr: null as number | null,
    subsidyInr: num(parsed.mp_govt_subsidy_amount_inr),
    rebateIncentiveInr: num(parsed.rebate_incentive_inr),
    arrearInr: num(parsed.principal_arrear_inr),
    receivedAgainstBillInr: num(parsed.amount_received_against_bill_inr),
    currentMonthBillInr: num(parsed.current_month_bill_amount_inr),
    totalAmountTillDueInr: num(parsed.total_amount_till_due_inr),
    totalAmountAfterDueInr: num(parsed.total_amount_after_due_inr),
    totalAmountPayableInr: num(parsed.total_amount_payable_inr),
    nfp: Boolean(parsed.nfp_flag)
  };

  const ref = pickReferenceAmount(parsed);
  const referenceInr = ref?.ref ?? 0;
  const calculatedInr = breakdown.netPayable;
  const deltaInr = r2(referenceInr - calculatedInr);
  const deltaAbs = Math.abs(deltaInr);
  const deltaPct = referenceInr > 0 ? r2((deltaInr / referenceInr) * 100) : 0;

  const status: MpAuditMatchStatus =
    deltaAbs <= TOLERANCE_INR ? "match" : deltaInr > 0 ? "mismatch_high" : "mismatch_low";

  const variance = classifyVariance({ delta: deltaInr, deltaAbs, parsed, breakdown });

  const riskFlags: string[] = [];
  if (!units.consistent) riskFlags.push(units.note ?? "Units inconsistent");
  if (discomConfidence < 0.7) riskFlags.push(`Low DISCOM detection confidence (${discomConfidence}).`);
  if (categoryConfidence < 0.7) riskFlags.push(`Low category detection confidence (${categoryConfidence}).`);
  if (printed.nfp) riskFlags.push("NFP flag set on bill.");
  if (sanctionedLoadKw == null && (category === "LV1.2" ? units.chosen > 150 : true)) {
    riskFlags.push("Sanctioned load missing — fixed-charge calculation used a default of 1 kW.");
  }

  const narrativeMd =
    `**Audit ${variance.reason === "no_variance" ? "✓ MATCH" : "⚠ MISMATCH"}** ` +
    `for ${parsed.consumer_id ?? "consumer"} (${meta.code} · ${meta.zone} · ${category}, ${parsed.bill_month ?? "unknown month"}).\n\n` +
    `- Calculated net payable: **₹${calculatedInr.toLocaleString("en-IN")}**\n` +
    `- Bill says: **₹${referenceInr.toLocaleString("en-IN")}** (${ref?.field ?? "—"})\n` +
    `- Δ = **₹${deltaInr.toLocaleString("en-IN")}** (${deltaPct}%)\n` +
    `- Reason: \`${variance.reason}\`\n\n` +
    breakdown.notes.map((n) => `- ${n}`).join("\n");

  return {
    auditRef: makeAuditRef(parsed),
    generatedAtIso: new Date().toISOString(),
    schemaVersion: "mp.audit/2025-26.v1",
    identification: {
      detectedState: parsed.state?.trim() || "Madhya Pradesh",
      detectedDiscom: discomCode,
      detectedZone: meta.zone,
      discomConfidence,
      detectedCategory: category,
      categoryConfidence,
      consumerId: parsed.consumer_id?.trim() || null,
      meterNumber: parsed.meter_number?.trim() || null,
      connectionDate: parsed.connection_date?.trim() || null,
      sanctionedLoadKw,
      contractDemandKva: loadParsed.kva,
      phase: loadParsed.phase,
      area,
      billingMonth: parsed.bill_month?.trim() || null,
      billingPeriodFromIso: period.fromIso,
      billingPeriodToIso: period.toIso
    },
    unitsExtraction: {
      meteredUnits: units.meteredUnits,
      monthsHistoryUnits: units.monthsHistoryUnits,
      chosenUnits: units.chosen,
      unitsSource: units.source,
      unitsConsistent: units.consistent,
      inconsistencyNote: units.note
    },
    calculation: {
      breakdown,
      fppasUsedPct: options?.fppasPct ?? null,
      agjyApplied: breakdown.subsidyCredit !== 0
    },
    printed,
    validation: {
      referenceField: ref?.field ?? "current_month_bill",
      referenceInr,
      calculatedInr,
      deltaInr,
      deltaPct,
      status,
      primaryReason: variance.reason,
      reasonExplanations: variance.explanations
    },
    riskFlags,
    narrativeMd
  };
}

/** Convenience wrapper for batch processing in /api routes. */
export function auditMpBillsBatch(
  bills: Array<{ parsed: ParsedBillShape; options?: MpBillAuditOptions }>
): MpBillAuditReport[] {
  return bills.map(({ parsed, options }) => auditMpBill(parsed, options));
}
