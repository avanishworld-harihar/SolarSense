/**
 * Sol.52 — Smart Multi-Factor MP billing resolver (FY 2025–26 LT).
 *
 * Combines THREE signals — not load alone:
 *   1) Printed tariff class (LV-1.x, LV-2.x, …)
 *   2) Purpose of connection (School vs Shop vs Domestic …)
 *   3) Sanctioned load (+ optional contract demand / demand-opted flag)
 *
 * Optionally cross-checks Fixed + Energy (+ Duty) lines from the bill OCR pass.
 * ToD surcharges are explicitly OUT OF SCOPE — see product decision in issue thread.
 */

import {
  MP_TARIFF_FY_2025_26,
  normalizeTariffCategory,
  type MpAreaProfile,
  type MpTariffCategory
} from "@/lib/mp-tariff-2025-26";

const r2 = (n: number) => Math.round(n * 100) / 100;

export type MpSmartBillingSignals = {
  /** Raw tariff string from bill header, e.g. "LV2 [LV2.2]" */
  tariffCategoryRaw?: string | null;
  /**
   * Canonical purpose / use (MPEZ bills: "Shops/Showrooms", "Domestic", …).
   * Prefer over generic `connectionType` when populated.
   */
  purposeOfSupply?: string | null;
  /** Fallback when purpose not split by OCR */
  connectionType?: string | null;
  sanctionedLoadKw?: number | null;
  contractDemandKva?: number | null;
  area?: MpAreaProfile;
  /** OCR lines for board cross-check */
  energyChargesInr?: number | null;
  fixedChargesInr?: number | null;
  electricityDutyInr?: number | null;
  referenceUnits?: number | null;
};

export type MpSmartBillingResolution = {
  category: MpTariffCategory;
  /** Human label e.g. "LV2.2 · sanctioned-load · urban" */
  billingSubTypeLabel: string;
  /** Inferred ₹/kWh from Energy ÷ units when bill lines verify; else null */
  effectiveTariffRateInrPerKwh: number | null;
  /** When model & board disagree on EC+FC, pin these for the engine */
  energyRateOverridePerUnit?: number;
  fixedChargeOverrideInr?: number;
  notes: string[];
  /** True when printed header & purpose-driven category disagreed */
  hadCategoryConflict: boolean;
};

function nz(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Schools / hostels / labs — MPERC LV-2.1 list (narrow). */
export function purposeHintsLV21(purpose: string): boolean {
  const s = purpose.toLowerCase();
  return /\b(school|college|universit|educat|hostel|student|sports|working\s*women|laborator|laboratory)\b/i.test(
    s
  );
}

/** Shops, hospitals, offices — default LV-2.2 under MPERC annex. */
export function purposeHintsLV22Commercial(purpose: string): boolean {
  const s = purpose.toLowerCase();
  return /\b(shop|showroom|office|hospital|hotel|restaurant|commercial|business|duk|godown|warehouse)\b/i.test(
    s
  );
}

/**
 * Resolve internal `MpTariffCategory` using purpose PRIOR to blind trust in
 * printed "LV2 [LV2.2]" codes (DISCOM layout often reuses one sub-code).
 */
export function resolveCategoryMultiFactor(signals: MpSmartBillingSignals): {
  category: MpTariffCategory;
  hadConflict: boolean;
  conflictNote?: string;
} {
  const purpose = `${signals.purposeOfSupply ?? ""} ${signals.connectionType ?? ""}`.trim();

  const purposeFirst: MpTariffCategory | null = purpose
    ? purposeHintsLV21(purpose)
      ? "LV2.1"
      : purposeHintsLV22Commercial(purpose)
        ? "LV2.2"
        : /domestic|residen|home|light\s*and\s*fan|lifeline|bpl\b/i.test(purpose)
          ? "LV1.2"
          : /agri|kisan|pump|krishi/i.test(purpose)
            ? "LV5.1"
            : /indust|manufact|factory|workshop\b/i.test(purpose) && !purposeHintsLV21(purpose)
              ? "LV4"
              : null
    : null;

  const fromTariff = normalizeTariffCategory(signals.tariffCategoryRaw);

  let category: MpTariffCategory = fromTariff ?? purposeFirst ?? "LV1.2";
  let hadConflict = false;
  let conflictNote: string | undefined;

  if (purposeFirst && fromTariff && purposeFirst !== fromTariff) {
    // Institutional purpose wins over a generic "LV2" print for category family.
    if (purposeFirst === "LV2.1" && fromTariff === "LV2.2") {
      category = "LV2.1";
      hadConflict = true;
      conflictNote = "Purpose suggests educational LV-2.1; bill header showed LV-2.2 — using LV2.1.";
    } else if (purposeFirst === "LV2.2" && fromTariff === "LV2.1") {
      category = "LV2.2";
      hadConflict = true;
      conflictNote = "Purpose suggests commercial LV-2.2; bill header showed LV-2.1 — using LV2.2.";
    }
  } else if (!fromTariff && purposeFirst) {
    category = purposeFirst;
  }

  return { category, hadConflict, conflictNote };
}

/**
 * Rough expected energy + fixed for MPERC LV2.2 sanctioned-load sub-type
 * (non-telescopic energy) — used only to detect engine vs board mismatch.
 */
function roughExpectedLv22Sl(
  units: number,
  loadKw: number,
  area: MpAreaProfile,
  demandOpted: boolean
): { ec: number; fc: number } | null {
  if (demandOpted || loadKw > 10) return null;
  const lf = MP_TARIFF_FY_2025_26["LV2.2"].loadFixed;
  if (!lf?.sanctionedLoadLimitKw) return null;
  const split = lf.consumptionSplitUnits ?? 50;
  const urban = area !== "rural";
  const hi = units > split;
  const rate = hi ? lf.energyRatePerUnitHigh ?? 8.0 : lf.energyRatePerUnitLow ?? 6.5;
  const perKw = hi
    ? urban
      ? lf.perKwUrbanHigh ?? 0
      : lf.perKwRuralHigh ?? 0
    : urban
      ? lf.perKwUrbanLow ?? 0
      : lf.perKwRuralLow ?? 0;
  const ec = r2(units * rate);
  const fc = Math.round(Math.max(1, loadKw) * perKw);
  return { ec, fc };
}

/**
 * Full smart resolution: category + optional board-verified rate pinning.
 */
export function resolveMpSmartBilling(signals: MpSmartBillingSignals): MpSmartBillingResolution {
  const { category, hadConflict, conflictNote } = resolveCategoryMultiFactor(signals);
  const notes: string[] = [];
  if (conflictNote) notes.push(conflictNote);

  const loadKw = signals.sanctionedLoadKw ?? 0;
  const cd = signals.contractDemandKva ?? 0;
  const demandOpted = cd > 0;
  const area: MpAreaProfile = signals.area ?? "urban";

  let billingSubTypeLabel: string = category;
  if (category === "LV2.2") {
    billingSubTypeLabel = demandOpted || loadKw > 10
      ? `LV2.2 · demand-based${demandOpted ? ` · ${r2(cd)} kVA` : ""}`
      : loadKw > 0 && loadKw <= 10
        ? "LV2.2 · sanctioned-load ≤10 kW · non-telescopic energy"
        : "LV2.2 · check load / demand";
  } else if (category === "LV2.1") {
    billingSubTypeLabel = "LV2.1 · sanctioned-load (education / hostels)";
  }

  let effectiveTariffRateInrPerKwh: number | null = null;
  const u = signals.referenceUnits ?? 0;
  const e = nz(signals.energyChargesInr);
  if (u > 0 && e != null && e > 0) {
    effectiveTariffRateInrPerKwh = r2(e / u);
    notes.push(`Board implied energy rate ≈ ₹${effectiveTariffRateInrPerKwh}/kWh (${e} ÷ ${u} u).`);
  }

  let energyRateOverridePerUnit: number | undefined;
  let fixedChargeOverrideInr: number | undefined;

  // Smart “board wins” when OCR lines prove the DISCOM is not charging what the naive
  // parser thought — only for LV2.2 + sanctioned path with a full bill triple.
  if (
    category === "LV2.2" &&
    loadKw > 0 &&
    loadKw <= 10 &&
    !demandOpted &&
    u > 0 &&
    e != null &&
    nz(signals.fixedChargesInr) != null
  ) {
    const fc = nz(signals.fixedChargesInr)!;
    const rough = roughExpectedLv22Sl(u, loadKw, area, false);
    if (rough) {
      const ecDev = Math.abs(rough.ec - e) / Math.max(e, 1);
      const fcDev = Math.abs(rough.fc - fc) / Math.max(fc, 1);
      if (ecDev > 0.1 || fcDev > 0.12) {
        energyRateOverridePerUnit = r2(e / u);
        fixedChargeOverrideInr = Math.round(fc);
        notes.push(
          "Smart Detection: printed Energy/Fixed diverge >10% vs MPERC slab replica — " +
            `pinning board lines (EC ₹${e}, FC ₹${fc}) for the tariff engine.`
        );
      }
    }
  }

  return {
    category,
    billingSubTypeLabel,
    effectiveTariffRateInrPerKwh,
    energyRateOverridePerUnit,
    fixedChargeOverrideInr,
    notes,
    hadCategoryConflict: hadConflict
  };
}
