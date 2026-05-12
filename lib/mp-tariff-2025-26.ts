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
 *
 * ─── TARIFF STATUS (May 2026) ───────────────────────────────────────────────
 * This file contains FY 2025-26 rates (bills billed MAY-2025 through MAR-2026).
 * FY 2026-27 tariff is codified in lib/mp-tariff-2026-27.ts and is now ACTIVE
 * for bills with bill_month >= APR-2026 (engine auto-selects based on billMonth).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type MpDiscomCode = "MPPaKVVCL" | "MPMKVVCL" | "MPPKVVCL";
export type MpZoneCode = "MPWZ" | "MPCZ" | "MPEZ";
export type MpPhase = "single" | "three";
export type MpAreaProfile = "urban" | "rural";

/** Top-level retail tariff categories that the audit engine understands. */
export type MpTariffCategory =
  | "LV1.1" // Domestic — BPL / unmetered (legacy)
  | "LV1.2" // Domestic — metered (most consumers)
  | "LV2.1" // Non-Domestic — schools/education/hostels
  | "LV2.2" // Non-Domestic — commercial; sanctioned-load ≤10 kW or demand-based
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
  /** Optional alternate energy slab set for rural/Gram Panchayat tariffs. */
  ruralEnergySlabs?: EnergySlab[];
  /** Domestic-style FC. */
  domesticFixed?: DomesticFixedRule;
  /**
   * Generic load/demand based fixed charge mode used by LV-2 / LV-4 / LV-6.
   * One of the candidates below is selected by the engine based on inputs.
   *
   * LV-2.2 has TWO billing sub-types (MPERC FY 2025-26):
   *   A) Sanctioned-Load-Based — available when connected load ≤ sanctionedLoadLimitKw (10 kW).
   *      Engine selects this when sanctionedLoadKw ≤ limit AND no contractDemandKva given.
   *      Energy regime: non-telescopic — ALL units billed at the regime rate
   *        (≤50 units → ₹6.50/unit + ₹88/kW;  >50 units → ₹8.00/unit + ₹144/kW).
   *   B) Demand-Based — mandatory for >10 kW; optional (consumer choice) for ≤10 kW.
   *      Uses perKwUrban / perKvaUrban for fixed; flat ₹7.10/unit energy.
   */
  loadFixed?: {
    /** Demand-based FC per kW (Urban / Rural). */
    perKwUrban?: number;
    perKwRural?: number;
    /** Demand-based FC per kVA (Urban / Rural) — preferred when contractDemandKva given. */
    perKvaUrban?: number;
    perKvaRural?: number;
    /**
     * LV-2.2 sanctioned-load-based sub-type:
     * Max connected load (kW) below which sanctioned-load-based billing applies.
     * Engine uses this to detect sub-type; undefined = no SL sub-type for this category.
     */
    sanctionedLoadLimitKw?: number;
    /** Consumption threshold (units) that switches FC rate AND energy regime for SL sub-type. */
    consumptionSplitUnits?: number;
    /** SL sub-type FC per kW when consumption ≤ consumptionSplitUnits. */
    perKwUrbanLow?: number;
    perKwRuralLow?: number;
    /** SL sub-type FC per kW when consumption > consumptionSplitUnits. */
    perKwUrbanHigh?: number;
    perKwRuralHigh?: number;
    /** Energy rate for SL sub-type when consumption ≤ consumptionSplitUnits. */
    energyRatePerUnitLow?: number;
    /** Energy rate for SL sub-type when consumption > consumptionSplitUnits. */
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
    energySlabs: [{ fromUnit: 0, toUnit: 30, ratePerUnit: 3.50 }],
    domesticFixed: {
      upto50Urban: 0, upto50Rural: 0,
      upto150Urban: 0, upto150Rural: 0,
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
      // FY 2025-26 LV1.2 (>150 units): verified from MPEZ bills as
      // ceil(units/15) blocks × ₹28/block (urban). The billing system does
      // not cap this by sanctioned-load blocks for these bills.
      above150PerPointKwUrban: 28, above150PerPointKwRural: 26,
      loadStepKw: 0.1
    }
  },
  "LV2.1": {
    category: "LV2.1",
    applicabilityNote:
      "Non-Domestic — Schools, educational institutions (workshops/labs), " +
      "hostels for students / working-women / sports persons. " +
      "Sanctioned-load tariff (≤10 kW): ₹6.70/u + ₹162/kW urban. " +
      "Demand-based tariff (>10 kW mandatory / ≤10 kW optional): ₹6.90/u + ₹281/kW.",
    // Demand-based energy slabs. Engine overrides to sanctioned-load flat rate for ≤10 kW without CD.
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 6.90 }],
    loadFixed: {
      sanctionedLoadLimitKw: 10,
      perKwUrbanLow: 162,  perKwRuralLow: 131,
      energyRatePerUnitLow: 6.70,
      perKwUrban: 281, perKwRural: 241,
      perKvaUrban: 225, perKvaRural: 193
    }
  },
  "LV2.2": {
    category: "LV2.2",
    applicabilityNote:
      "Non-Domestic — Shops, showrooms, offices, hospitals, restaurants & all other " +
      "non-domestic not in LV-2.1. " +
      "SUB-TYPE A (Sanctioned-Load-Based, ≤10 kW): non-telescopic regime — " +
      "≤50 u → ₹6.50/u + ₹88/kW; >50 u → ₹8.00/u + ₹144/kW. " +
      "SUB-TYPE B (Demand-Based, >10 kW mandatory / ≤10 kW optional): ₹7.10/u + ₹302/kW.",
    // Demand-based energy slabs (sub-type B). Engine overrides to non-telescopic for sub-type A.
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 7.10 }],
    loadFixed: {
      // ── Sub-type A: Sanctioned-Load-Based (connected load ≤ 10 kW) ──────────────
      sanctionedLoadLimitKw: 10,
      consumptionSplitUnits: 50,
      perKwUrbanLow: 88,   perKwRuralLow: 73,    // ≤50 units regime
      perKwUrbanHigh: 144, perKwRuralHigh: 123,   // >50 units regime
      energyRatePerUnitLow: 6.50,
      energyRatePerUnitHigh: 8.00,
      // ── Sub-type B: Demand-Based ─────────────────────────────────────────────────
      perKwUrban: 302, perKwRural: 220,
      perKvaUrban: 242, perKvaRural: 176
    }
  },
  "LV3": {
    category: "LV3",
    applicabilityNote: "Public Water Works & Street Light — single block tariff.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 6.03 }],
    ruralEnergySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 5.75 }],
    loadFixed: {
      perKwUrban: 372, perKwRural: 184
    }
  },
  "LV4": {
    category: "LV4",
    applicabilityNote: "LT Industrial — manufacturing & workshops. Demand-based mandatory.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 6.76 }],
    loadFixed: {
      perKwUrban: 326, perKwRural: 211,
      perKvaUrban: 261, perKvaRural: 169
    }
  },
  "LV5.1": {
    category: "LV5.1",
    applicabilityNote: "Agriculture — metered pumps & allied. Energy slab + HP-based fixed charge.",
    energySlabs: [
      { fromUnit: 0, toUnit: 300, ratePerUnit: 5.07 },
      { fromUnit: 301, toUnit: 750, ratePerUnit: 6.10 },
      { fromUnit: 751, toUnit: null, ratePerUnit: 6.38 }
    ],
    loadFixed: {
      perKwUrbanLow: 67,
      perKwUrbanHigh: 83,
      perKwUrban: 91
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
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 7.14 }],
    loadFixed: {
      perKwUrban: 0, perKwRural: 0
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
    brackets: [{ untilUnits: null, rate: 0.09 }]
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
 * Atal Griha Jyoti / Indira Griha Jyoti Yojana (AGJY/IGJY) — legacy AGJY-only constants.
 * Kept for backward compatibility; new code should prefer `MP_DOMESTIC_SUBSIDY_FY_2025_26`
 * which encodes the full empirically-verified MP Govt. domestic subsidy schedule.
 */
export const ATAL_GRIHA_JYOTI = {
  eligibleCategories: ["LV1.2"] as MpTariffCategory[],
  /** Monthly metered units above this → AGJY (first-100-u) slab no longer the anchor. */
  monthlyEligibilityCapUnits: 150,
  subsidisedFirstUnitsCount: 100,
  consumerCappedRatePerUnit: 1.0
};

/**
 * MP Govt. Domestic Subsidy schedule — FY 2025-26 (effective MAY-2025 → MAR-2026).
 *
 * Empirically reverse-engineered from a verified 12-month MPEZ bill set
 * (consumer N1906004864, LV-1.2 urban) covering units 122 → 435 across the
 * full FY. The printed `M.P. Govt. Subsidy Amount` line on each bill follows
 * a TIERED model, NOT the simple "₹1/u on first 100 u − ₹100" rule that
 * older engine builds used (which materially under-counts the credit).
 *
 *   Tier A — Heavy subsidy bracket (≤150 u/month, LV-1.2 only):
 *     The state covers (a) the full slab energy on the first 100 u plus
 *     (b) a proportional share of fixed charge and electricity duty
 *     scaled by 100/units, minus the consumer's ₹100 cap. Encoded as:
 *
 *       subsidy = slabEnergy(min(units, 100))
 *               + (fixedCharge + electricityDuty) × min(100/units, 1)
 *               − consumerCapInr
 *
 *     Verified against printed line on NOV/DEC/JAN/FEB bills:
 *       122 u → printed −₹544.96, model ≈ −₹544.64 (Δ ₹0.32)
 *       122 u → printed −₹536.31, model ≈ −₹547.10 (Δ ₹10.79)
 *       126 u → printed −₹529.98, model ≈ −₹544.59 (Δ ₹14.61)
 *       147 u → printed −₹559.69, model ≈ −₹531.10 (Δ ₹28.59)
 *
 *   Tier B — Mid-consumption bracket (151–300 u/month, LV-1.2 only):
 *     Verified MAR-2026 (275 u → −₹76.57): subsidy ≈ ₹0.279 × units.
 *
 *   Tier C — High-consumption courtesy cap (300 u < units ≤ 500, LV-1.2 only):
 *     FY 2025-26 set this to ₹0 (verified: AUG-25 316 u → 0; SEP-25 326 u → 0;
 *     JUL-25 361 u → 0; MAY-25 422 u → 0; JUN-25 435 u → 0).
 *
 *   Tier D — Above 500 u: no subsidy.
 *
 * The bill engine uses this schedule as the **only** M.P. Govt. domestic subsidy
 * for LV-1.2 — from units + tariff context inside `calculateMpBill`, never from
 * the printed subsidy line on the bill.

 */
export type MpDomesticSubsidyTier = {
  /** Inclusive upper unit bound; null = catch-all. */
  untilUnits: number | null;
  /** Subsidy model kind. */
  model:
    | "agjy_slab_with_proportional_fc_duty" // Tier A
    | "per_unit_credit"                     // Tier B
    | "flat_cap"                            // Tier C
    | "none";                               // Tier D
  /** When model = "per_unit_credit": ₹/u credit. */
  perUnitInr?: number;
  /** When model = "flat_cap": flat ₹ credit. */
  flatInr?: number;
  /** When model = "agjy_slab_with_proportional_fc_duty": consumer's ₹ cap. */
  consumerCapInr?: number;
  /** When model = "agjy_slab_with_proportional_fc_duty": first-N-units slab anchor. */
  subsidisedFirstUnitsCount?: number;
  /**
   * Optional gate: tier only activates from this YYYY-MM (inclusive) onwards.
   * Used to capture mid-FY notifications — e.g. the 151–300 u extension
   * appeared on MAR-2026 bills but was zero on the preceding 11 months
   * of FY 2025-26. Engine falls back to `tier.model = "none"` when the
   * row's bill month predates this gate.
   */
  effectiveFromYearMonth?: string;
  note: string;
};

export type MpDomesticSubsidySchedule = {
  fy: "2025-26" | "2026-27";
  eligibleCategories: MpTariffCategory[];
  tiers: MpDomesticSubsidyTier[];
};

export const MP_DOMESTIC_SUBSIDY_FY_2025_26: MpDomesticSubsidySchedule = {
  fy: "2025-26",
  eligibleCategories: ["LV1.2"],
  tiers: [
    {
      untilUnits: 150,
      model: "agjy_slab_with_proportional_fc_duty",
      consumerCapInr: 100,
      subsidisedFirstUnitsCount: 100,
      note:
        "≤150 u (AGJY anchor): subsidy = slabEnergy(min(units,100)) + (FC+ED)×(100/units) − ₹100; " +
        "verified against 4 MPEZ bills, average residual < ₹15."
    },
    {
      untilUnits: 300,
      model: "per_unit_credit",
      perUnitInr: 0.279,
      // Verified empirically: extension to 151-300 u domestic consumers landed
      // on the MAR-2026 billing cycle (₹76.57 credit for 275 u). The 5 prior
      // FY 2025-26 months with 151-300 u consumption (OCT-2025 236 u, plus
      // 316-422 u Aug-Sep) all printed ₹0 on the subsidy line. Engine therefore
      // gates this tier behind `effectiveFromYearMonth = 2026-03`.
      effectiveFromYearMonth: "2026-03",
      note:
        "151–300 u: ₹0.279/u credit, effective MAR-2026+ in FY 2025-26 " +
        "(verified MAR-2026 275 u → −₹76.57; pre-MAR FY 25-26 rows priced at ₹0)."
    },
    {
      untilUnits: 500,
      model: "none",
      note: "301–500 u: FY 2025-26 had no MP Govt. courtesy cap (verified across 5 MPEZ bills)."
    },
    {
      untilUnits: null,
      model: "none",
      note: ">500 u: no subsidy."
    }
  ]
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
 * Monthly FPPAS (Fuel and Power Purchase Adjustment Surcharge) rates for
 * MPPKVVCL (MPEZ) — ₹/unit (not % of energy).  Key = "YYYY-MM".
 *
 * FPPAS is published per billing window (meter-read cycle), so two consumers
 * with different read dates use different approved rates even in the same
 * calendar month.  The rates below are derived from 12 actual MPEZ bills of
 * LV2.2 commercial consumer N1905018349 (Satna, meter read ≈ 6–10th of each
 * month) by computing:  FPPAS_line_₹ ÷ metered_units.
 *
 *   Month   FPPAS ÷ Units   Rate (₹/unit)
 *   MAY-25  ₹316.67 ÷ 1215   0.2607
 *   JUN-25  ₹175.97 ÷  911   0.1932
 *   JUL-25  ₹  66.65 ÷  346   0.1926
 *   AUG-25  ₹  45.89 ÷  327   0.1403
 *   SEP-25  −₹  20.56 ÷  347  −0.0593
 *   OCT-25  −₹116.12 ÷  398  −0.2918
 *   NOV-25  −₹123.35 ÷  447  −0.2759
 *   DEC-25  −₹  12.61 ÷  301  −0.0419
 *   JAN-26  ₹  17.00 ÷  171   0.0994
 *   FEB-26  ₹  10.43 ÷  463   0.0225
 *   MAR-26  −₹  59.59 ÷  445  −0.1339
 *   APR-26  ₹143.53 ÷ 1325   0.1083245…
 */
export const MP_FPPAS_MONTHLY_RATES: Record<string, number> = {
  "2025-05":  0.2607,
  "2025-06":  0.1932,
  "2025-07":  0.1926,
  "2025-08":  0.1403,
  "2025-09": -0.0593,
  "2025-10": -0.2918,
  "2025-11": -0.2759,
  "2025-12": -0.0419,
  "2026-01":  0.0994,
  "2026-02":  0.0225,
  "2026-03": -0.1339,
  "2026-04":  0.1083245283018868,
};

/**
 * Default FPPAS when no monthly entry is found (₹/unit, not percent).
 */
export const MP_FPPAS_DEFAULT_PCT = 0.06;

const BILL_MONTH_NAME_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

/**
 * Look up the monthly FPPAS rate for a given bill month label.
 * Accepts formats like "APR-2026", "Apr 2026", "April 2026", "2026-04".
 * Falls back to MP_FPPAS_DEFAULT_PCT if the month is not in the table.
 */
export function getFppasForBillMonth(billMonth?: string | null): number {
  if (!billMonth) return MP_FPPAS_DEFAULT_PCT;
  const s = billMonth.trim().toLowerCase();

  // Try "YYYY-MM" format directly
  const isoMatch = s.match(/^(\d{4})-(\d{2})$/);
  if (isoMatch) {
    const key = `${isoMatch[1]}-${isoMatch[2]}`;
    return MP_FPPAS_MONTHLY_RATES[key] ?? MP_FPPAS_DEFAULT_PCT;
  }

  // Parse "APR-2026", "Apr 2026", "April 2026" etc.
  const parts = s.split(/[\s\-\/]+/).filter(Boolean);
  let monthNum: number | null = null;
  let year: number | null = null;
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (!isNaN(n) && n >= 2000 && n <= 2099) { year = n; continue; }
    const mn = BILL_MONTH_NAME_MAP[p.slice(0, 3)];
    if (mn) { monthNum = mn; continue; }
  }
  if (year && monthNum) {
    const key = `${year}-${String(monthNum).padStart(2, "0")}`;
    return MP_FPPAS_MONTHLY_RATES[key] ?? MP_FPPAS_DEFAULT_PCT;
  }
  return MP_FPPAS_DEFAULT_PCT;
}

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
  // Exact/minor LV codes first. MPEZ often prints values like "LV2 [LV2.2]";
  // a broad "LV2" match must not downgrade that to LV2.1.
  if (/lv\s*[-]?\s*1\s*\.?\s*1\b/.test(s)) return "LV1.1";
  if (/lv\s*[-]?\s*1\s*\.?\s*2\b/.test(s)) return "LV1.2";
  if (/lv\s*[-]?\s*2\s*\.?\s*1\b/.test(s)) return "LV2.1";
  if (/lv\s*[-]?\s*2\s*\.?\s*2\b/.test(s)) return "LV2.2";
  if (/lv\s*[-]?\s*5\s*\.?\s*1\b/.test(s)) return "LV5.1";
  if (/lv\s*[-]?\s*5\s*\.?\s*2\b/.test(s)) return "LV5.2";
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
  if (s.includes("indus") || s.includes("manufact")) return "LV4";
  if (s.includes("water") && s.includes("works")) return "LV3";
  if (s.includes("street light")) return "LV3";
  // LV2.2 — shops, offices, hospitals, restaurants and all other non-domestic
  if (
    s.includes("shop") || s.includes("showroom") || s.includes("office") ||
    s.includes("hospital") || s.includes("hotel") || s.includes("restaur") ||
    s.includes("commerc") || s.includes("non-domestic") || s.includes("non domestic") ||
    s.includes("professional") || s.includes("chamber")
  ) return "LV2.2";
  // LV2.1 — MPERC-specific: schools, educational, hostels for students/sports/working-women
  if (
    s.includes("school") || s.includes("college") || s.includes("educat") ||
    s.includes("hostel") || s.includes("workshop") || s.includes("laborator")
  ) return "LV2.1";
  if (s.includes("domest") || s.includes("residen") || s.includes("home stay")) return "LV1.2";
  return null;
}
