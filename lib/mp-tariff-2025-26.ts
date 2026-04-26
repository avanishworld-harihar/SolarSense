/**
 * MPERC FY 2025-26 — Madhya Pradesh Retail Supply Tariff (LT)
 *
 * Codified from the MPERC Final Order dated 29-Mar-2025 + LT Schedule (Annexure-2)
 * published on the MPCZ / MPEZ / MPWZ portals.
 *
 * Three DISCOMs (zones) are covered:
 *   - MPPaKVVCL (West / Paschim)  → MPWZ — Indore HQ
 *   - MPMKVVCL  (Central / Madhya) → MPCZ — Bhopal HQ
 *   - MPPKVVCL  (East / Poorv)    → MPEZ — Jabalpur HQ
 * Tariffs are uniform across all three DISCOMs (single state-level RST order).
 * Per-zone rules show up in: rural/urban classification, Atal Griha Jyoti
 * eligibility validation and the FPPAS percentage published month-wise by each
 * DISCOM (currently identical for all three because power purchase is pooled
 * via MP Power Management Co.).
 *
 * Sources cross-checked (April 2026):
 *  • MPCZ — Tariff_LT_Year_25_26.pdf (Annexure-2 LT schedule)
 *  • MPERC — Final_State_DISCOMs_ARR_and_Retail_Supply_Tariff_Order_FY_2025-26
 *  • MPCZ FPPAS circular w.e.f. 24-Nov-2025 → −2.23%
 *  • Govt. of MP — Atal Griha Jyoti / Indira Grah Jyoti Yojana 2024-25/2025-26
 */

export type MpDiscomCode = "MPPaKVVCL" | "MPMKVVCL" | "MPPKVVCL";
export type MpZoneCode = "MPWZ" | "MPCZ" | "MPEZ";
export type MpPhase = "single" | "three";
export type MpAreaProfile = "urban" | "rural";

/** Top-level retail tariff categories that the audit engine understands. */
export type MpTariffCategory =
  | "LV1.1" // Domestic — BPL / unmetered (legacy)
  | "LV1.2" // Domestic — metered (most consumers)
  | "LV2.1" // Non-Domestic — sanctioned-load based, ≤10 kW
  | "LV2.2" // Non-Domestic — demand based, >10 kW
  | "LV3"   // Public Water Works & Street Light
  | "LV4"   // LT Industrial (mandatory demand-based)
  | "LV5.1" // Agriculture — metered
  | "LV5.2" // Agriculture — unmetered (HP based)
  | "LV6";  // EV / Battery Charging Stations

export type MpDiscomMeta = {
  code: MpDiscomCode;
  zone: MpZoneCode;
  fullName: string;
  hq: string;
  /** Rough district pattern for fuzzy zone detection from address. */
  districtKeywords: string[];
};

export const MP_DISCOMS: Record<MpDiscomCode, MpDiscomMeta> = {
  MPPaKVVCL: {
    code: "MPPaKVVCL",
    zone: "MPWZ",
    fullName: "Madhya Pradesh Paschim Kshetra Vidyut Vitaran Co. Ltd.",
    hq: "Indore",
    districtKeywords: [
      "indore", "ujjain", "dewas", "ratlam", "khargone", "khandwa", "burhanpur",
      "dhar", "barwani", "alirajpur", "jhabua", "shajapur", "agar", "neemuch",
      "mandsaur"
    ]
  },
  MPMKVVCL: {
    code: "MPMKVVCL",
    zone: "MPCZ",
    fullName: "Madhya Pradesh Madhya Kshetra Vidyut Vitaran Co. Ltd.",
    hq: "Bhopal",
    districtKeywords: [
      "bhopal", "sehore", "raisen", "vidisha", "rajgarh", "betul", "harda",
      "hoshangabad", "narmadapuram", "guna", "ashoknagar", "shivpuri",
      "gwalior", "datia", "bhind", "morena", "sheopur"
    ]
  },
  MPPKVVCL: {
    code: "MPPKVVCL",
    zone: "MPEZ",
    fullName: "Madhya Pradesh Poorv Kshetra Vidyut Vitaran Co. Ltd.",
    hq: "Jabalpur",
    districtKeywords: [
      "jabalpur", "katni", "narsinghpur", "chhindwara", "seoni", "balaghat",
      "mandla", "dindori", "rewa", "satna", "sidhi", "singrauli", "shahdol",
      "umaria", "anuppur", "panna", "chhatarpur", "tikamgarh", "damoh", "sagar"
    ]
  }
};

/** Telescopic energy slab ([fromUnit, toUnit] inclusive, rate ₹/kWh). */
export type EnergySlab = { fromUnit: number; toUnit: number | null; ratePerUnit: number };

export type DomesticFixedRule = {
  // Slab fixed charges (used when consumption ≤ 150 units)
  upto50Urban: number;
  upto50Rural: number;
  upto150Urban: number;
  upto150Rural: number;
  // Above 150: per 0.1 kW of sanctioned/connected load.
  above150PerPointKwUrban: number;
  above150PerPointKwRural: number;
  /** 1 kW = 10 "points" of 0.1 kW step. */
  loadStepKw: 0.1;
};

/** Block of charges for one tariff category. */
export type CategoryTariff = {
  category: MpTariffCategory;
  applicabilityNote: string;
  energySlabs: EnergySlab[];
  /** Domestic-style FC. */
  domesticFixed?: DomesticFixedRule;
  /**
   * Generic load/demand based fixed charge mode used by LV-2 / LV-4 / LV-6.
   * One of the candidates below is selected by the engine based on inputs.
   */
  loadFixed?: {
    perKwUrban?: number;
    perKwRural?: number;
    perKvaUrban?: number;
    perKvaRural?: number;
    /** Some sub-slabs change with consumption (e.g. LV-2.1 ≤50 vs >50). */
    consumptionSplitUnits?: number;
    perKwUrbanLow?: number;
    perKwRuralLow?: number;
    perKwUrbanHigh?: number;
    perKwRuralHigh?: number;
    energyRatePerUnitLow?: number;
    energyRatePerUnitHigh?: number;
  };
  minimumChargeInr?: number;
  /** Electricity Duty rules differ by category — encoded in dutyRule below. */
};

/**
 * MPERC FY 2025-26 master schedule.
 * NOTE: Where MPERC publishes a single rate (e.g. LV-4 industrial 8.30 ₹/kWh),
 * we still expose it as a 1-row slab for engine uniformity.
 */
export const MP_TARIFF_FY_2025_26: Record<MpTariffCategory, CategoryTariff> = {
  "LV1.1": {
    category: "LV1.1",
    applicabilityNote: "BPL / unmetered domestic — legacy lifeline tariff (rare in retail bills).",
    energySlabs: [{ fromUnit: 0, toUnit: 30, ratePerUnit: 3.13 }],
    domesticFixed: {
      upto50Urban: 30, upto50Rural: 25,
      upto150Urban: 30, upto150Rural: 25,
      above150PerPointKwUrban: 0, above150PerPointKwRural: 0,
      loadStepKw: 0.1
    }
  },
  "LV1.2": {
    category: "LV1.2",
    applicabilityNote:
      "Domestic — metered residential, registered home stays, religious institutions. Telescopic slabs.",
    energySlabs: [
      { fromUnit: 0,   toUnit: 50,   ratePerUnit: 4.45 },
      { fromUnit: 51,  toUnit: 150,  ratePerUnit: 5.41 },
      { fromUnit: 151, toUnit: 300,  ratePerUnit: 6.79 },
      { fromUnit: 301, toUnit: null, ratePerUnit: 6.98 }
    ],
    domesticFixed: {
      upto50Urban: 76,  upto50Rural: 62,
      upto150Urban: 129, upto150Rural: 106,
      above150PerPointKwUrban: 28, above150PerPointKwRural: 26,
      loadStepKw: 0.1
    }
  },
  "LV2.1": {
    category: "LV2.1",
    applicabilityNote:
      "Non-Domestic / Commercial — sanctioned load up to 10 kW. Two-tier energy + per-kW fixed.",
    energySlabs: [
      { fromUnit: 0,  toUnit: 50,   ratePerUnit: 6.50 },
      { fromUnit: 51, toUnit: null, ratePerUnit: 8.00 }
    ],
    loadFixed: {
      consumptionSplitUnits: 50,
      perKwUrbanLow: 88,  perKwRuralLow: 73,
      perKwUrbanHigh: 144, perKwRuralHigh: 123,
      energyRatePerUnitLow: 6.50,
      energyRatePerUnitHigh: 8.00
    }
  },
  "LV2.2": {
    category: "LV2.2",
    applicabilityNote: "Non-Domestic / Commercial — demand-based (>10 kW load). 7.10 ₹/kWh + demand FC.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 7.10 }],
    loadFixed: {
      perKwUrban: 302, perKwRural: 220,
      perKvaUrban: 242, perKvaRural: 176
    }
  },
  "LV3": {
    category: "LV3",
    applicabilityNote: "Public Water Works & Street Light — single block tariff.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 6.10 }],
    loadFixed: {
      perKwUrban: 95, perKwRural: 78
    }
  },
  "LV4": {
    category: "LV4",
    applicabilityNote: "LT Industrial — manufacturing & workshops. Demand-based mandatory.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 8.30 }],
    loadFixed: {
      perKwUrban: 484, perKwRural: 484,
      perKvaUrban: 387, perKvaRural: 387
    }
  },
  "LV5.1": {
    category: "LV5.1",
    applicabilityNote: "Agriculture — metered pumps & allied. Heavily subsidised retail.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 5.74 }],
    loadFixed: {
      perKwUrban: 50, perKwRural: 25
    }
  },
  "LV5.2": {
    category: "LV5.2",
    applicabilityNote: "Agriculture — unmetered (charged on connected HP × monthly slab).",
    // Engine treats this as flat ₹/HP/month; energySlabs unused but kept for shape.
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 0 }],
    loadFixed: {
      perKwUrban: 825, perKwRural: 825 // ₹/HP/month → engine multiplies HP × this
    }
  },
  "LV6": {
    category: "LV6",
    applicabilityNote: "EV / Battery Charging / Swap Stations — single block + ToD rebate.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 5.85 }],
    loadFixed: {
      perKwUrban: 60, perKwRural: 60
    }
  }
};

/**
 * MP Govt Electricity Duty (LT) — applied as % of (energy + fixed).
 * Source: MPCZ "Tariff Details" page.
 */
export type ElectricityDutyRule = {
  category: MpTariffCategory;
  brackets: Array<{
    /** Inclusive upper bound of monthly units; null = catch-all. */
    untilUnits: number | null;
    /** Decimal rate (0.09 = 9%). */
    rate: number;
    note?: string;
  }>;
};

export const MP_ELECTRICITY_DUTY_FY_2025_26: Record<MpTariffCategory, ElectricityDutyRule> = {
  "LV1.1": { category: "LV1.1", brackets: [{ untilUnits: null, rate: 0.09 }] },
  "LV1.2": {
    category: "LV1.2",
    brackets: [
      { untilUnits: 100, rate: 0.09 },
      { untilUnits: null, rate: 0.12 }
    ]
  },
  "LV2.1": {
    category: "LV2.1",
    brackets: [
      { untilUnits: 50, rate: 0.09 },
      { untilUnits: null, rate: 0.15 }
    ]
  },
  "LV2.2": { category: "LV2.2", brackets: [{ untilUnits: null, rate: 0.15 }] },
  "LV3":  { category: "LV3",  brackets: [{ untilUnits: null, rate: 0.12 }] },
  "LV4":  { category: "LV4",  brackets: [{ untilUnits: null, rate: 0.09 }] },
  "LV5.1": { category: "LV5.1", brackets: [{ untilUnits: null, rate: 0.00 }] },
  "LV5.2": { category: "LV5.2", brackets: [{ untilUnits: null, rate: 0.00 }] },
  "LV6":  { category: "LV6",  brackets: [{ untilUnits: null, rate: 0.09 }] }
};

/**
 * Atal Griha Jyoti (state subsidy) FY 2025-26 — applies only to LV-1.2 domestic.
 * Logic per Govt of MP (and verified on MP-Govt subsidy lines we have seen on
 * actual MPPKVVCL bills):
 *   1. Eligibility floor: monthly metered consumption ≤ 150 kWh.
 *   2. For first 100 units → consumer pays ₹1/unit (capped subsidised line).
 *      Govt subsidy = (slab energy charge for first 100 units − 100).
 *   3. For 101..150 → no extra subsidy; billed at LV-1.2 normal slab rates.
 *      Any consumption ≥151 nullifies the subsidy entirely (handled in engine).
 *   4. Fixed charges, ED & FPPAS are NOT subsidised — consumer pays in full.
 */
export const ATAL_GRIHA_JYOTI = {
  eligibleCategories: ["LV1.2"] as MpTariffCategory[],
  monthlyEligibilityCapUnits: 150,
  subsidisedFirstUnitsCount: 100,
  consumerCappedRatePerUnit: 1.0
};

/**
 * Rebates & incentives (encoded per MPERC general T&Cs).
 * Engine outputs each as a *negative* line so net total can be reconstructed.
 */
export const MP_REBATES_FY_2025_26 = {
  onlinePaymentRebatePct: 0.005,   // 0.5%
  onlinePaymentRebateMaxInr: 1000,
  promptPaymentRebatePct: 0.0025,  // 0.25% if paid ≥ 7 days before due AND bill ≥ ₹1L
  promptPaymentMinBillInr: 100000,
  advancePaymentMonthlyInterestPct: 0.01, // 1%/month carry on advance balance
  prepaidLv1RebatePerUnit: 0.25
};

/**
 * Minimum charges for FY 2025-26 are explicitly *abolished* across LV-1, LV-2,
 * LV-4, LV-5 by the MPERC order. We retain the field for forward compatibility
 * but engine uses 0 unless overridden via DB row.
 */
export const MP_MIN_CHARGE_INR_FY_2025_26: Partial<Record<MpTariffCategory, number>> = {
  // none — abolished
};

/**
 * Default FPPAS for FY 2025-26 if a per-month override is not provided.
 *
 * MPERC publishes FPPAS *monthly* as a percentage of base energy charge.
 * Examples already on record (April 2026):
 *   • Feb 2025: −0.23%  (MP Power Management Letter)
 *   • Nov 2025: −2.23%  (MPCZ circular w.e.f. 24-Nov-2025)
 * Because it can be negative, the engine treats it as a signed multiplier
 * applied to the energy-charge subtotal.
 */
export const MP_FPPAS_DEFAULT_PCT = -0.0223;

/** Resolve a DISCOM by detected text (DISCOM name, code or zone hint). */
export function resolveMpDiscomFromHint(hint: string): MpDiscomMeta | null {
  const h = hint.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!h) return null;
  if (h.includes("paschim") || h.includes("mpwz") || h.includes("mppakvvcl") || h.includes("mppakvvcl")) return MP_DISCOMS.MPPaKVVCL;
  if (h.includes("madhya")  || h.includes("mpcz") || h.includes("mpmkvvcl")) return MP_DISCOMS.MPMKVVCL;
  if (h.includes("poorv")   || h.includes("mpez") || h.includes("mppkvvcl") || h.includes("mppgvvcl")) return MP_DISCOMS.MPPKVVCL;
  return null;
}

/** Best-effort zone detection from address text (fallback when DISCOM string missing). */
export function detectMpDiscomFromAddress(address?: string | null): MpDiscomMeta | null {
  const a = String(address ?? "").toLowerCase();
  if (!a) return null;
  for (const meta of Object.values(MP_DISCOMS)) {
    if (meta.districtKeywords.some((kw) => a.includes(kw))) return meta;
  }
  return null;
}

/**
 * Parse the printed `tariff_category` string from an extracted bill into our
 * canonical category code. Highly tolerant — handles strings like
 * "LV 1.2 Domestic", "LV-2 Non Domestic", "LT Industry LV-4", etc.
 */
export function normalizeTariffCategory(raw?: string | null): MpTariffCategory | null {
  const s = String(raw ?? "").toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;
  // Direct LV codes first.
  const m = s.match(/lv\s*[-]?\s*(\d)\s*\.?\s*(\d)?/i);
  if (m) {
    const major = m[1];
    const minor = m[2] ?? "";
    const key = `LV${major}${minor ? "." + minor : ""}` as MpTariffCategory;
    if (key in MP_TARIFF_FY_2025_26) return key;
    // Fall through if minor missing.
    if (major === "1") return "LV1.2";
    if (major === "2") return s.includes("demand") ? "LV2.2" : "LV2.1";
    if (major === "3") return "LV3";
    if (major === "4") return "LV4";
    if (major === "5") return s.includes("unmeter") ? "LV5.2" : "LV5.1";
    if (major === "6") return "LV6";
  }
  if (s.includes("ev")  || s.includes("charging station")) return "LV6";
  if (s.includes("agri") || s.includes("kisan") || s.includes("pump")) return "LV5.1";
  if (s.includes("indus") || s.includes("manufact") || s.includes("workshop")) return "LV4";
  if (s.includes("water") && s.includes("works")) return "LV3";
  if (s.includes("street light")) return "LV3";
  if (s.includes("commerc") || s.includes("shop") || s.includes("non-domestic") || s.includes("non domestic")) {
    return "LV2.1";
  }
  if (s.includes("domest") || s.includes("residen") || s.includes("home stay")) return "LV1.2";
  return null;
}
