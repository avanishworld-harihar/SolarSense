/**
 * MPERC FY 2026-27 — Madhya Pradesh Retail Supply Tariff (LT)
 *
 * Codified from the MPERC Tariff Order effective April 2026.
 * Codified from MPERC Petition No. 140/2025 tariff schedule.
 *
 * LV2.2 (Non-Domestic) official MPERC FY 2026-27 schedule:
 *   Sanctioned-load based, connected load ≤10 kW:
 *     ≤50 u → ₹6.80/u + ₹98/kW urban
 *     >50 u → ₹8.2823/u + ₹153.41/kW urban (MPEZ bill APR-2026 N1905018349; order text often rounds to 8.30/154)
 *   Demand-based:
 *     ₹7.40/u + ₹312/kW or ₹250/kVA urban
 */

import type {
  CategoryTariff,
  ElectricityDutyRule,
  MpDomesticSubsidySchedule,
  MpTariffCategory
} from "@/lib/mp-tariff-2025-26";

/**
 * MP Govt. Domestic Subsidy schedule — FY 2026-27 (effective APR-2026 onwards).
 *
 * Verified APR-2026 (327 u → −₹100): the courtesy cap for the 301-500 u
 * bracket was reinstated for FY 2026-27 (was ₹0 in FY 2025-26). Tiers A
 * and B follow the same formulas as FY 2025-26 (no MP gazette change to
 * the AGJY anchor), but the slab energies/duties on Tier A naturally
 * use the FY 2026-27 tariffs because the engine looks them up from the
 * active tariff year. We retain `consumerCapInr = 100` (verified).
 */
export const MP_DOMESTIC_SUBSIDY_FY_2026_27: MpDomesticSubsidySchedule = {
  fy: "2026-27",
  eligibleCategories: ["LV1.2"],
  tiers: [
    {
      untilUnits: 150,
      model: "agjy_slab_with_proportional_fc_duty",
      consumerCapInr: 100,
      subsidisedFirstUnitsCount: 100,
      note:
        "≤150 u (AGJY anchor, FY 26-27): subsidy = slabEnergy(min(units,100)) + (FC+ED)×(100/units) − ₹100 " +
        "using FY 26-27 slab rates (₹4.71 / ₹5.67)."
    },
    {
      untilUnits: 300,
      model: "per_unit_credit",
      perUnitInr: 0.305,
      note:
        "151–300 u: ₹0.305/u credit. FY 26-27 calibrated halfway between FY 25-26 (₹0.279/u) " +
        "and the verified 301 u APR-26 cap (₹100 ≈ ₹0.331/u). Subject to recalibration as " +
        "more FY 26-27 bills in this band are observed."
    },
    {
      untilUnits: 500,
      model: "flat_cap",
      flatInr: 100,
      note: "301–500 u: flat ₹100 courtesy cap (verified APR-2026 327 u → −₹100)."
    },
    {
      untilUnits: null,
      model: "none",
      note: ">500 u: no subsidy."
    }
  ]
};

export const MP_TARIFF_FY_2026_27: Record<MpTariffCategory, CategoryTariff> = {
  "LV1.1": {
    category: "LV1.1",
    applicabilityNote: "BPL / unmetered domestic — legacy lifeline tariff.",
    energySlabs: [{ fromUnit: 0, toUnit: 30, ratePerUnit: 3.72 }],
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
      "Domestic — metered residential. FY 2026-27 telescopic slabs.",
    energySlabs: [
      { fromUnit: 0,   toUnit: 50,   ratePerUnit: 4.71 },
      { fromUnit: 51,  toUnit: 150,  ratePerUnit: 5.67 },
      { fromUnit: 151, toUnit: 300,  ratePerUnit: 7.05 },
      { fromUnit: 301, toUnit: null, ratePerUnit: 7.24 }
    ],
    domesticFixed: {
      upto50Urban: 81,  upto50Rural: 67,
      upto150Urban: 134, upto150Rural: 111,
      above150PerPointKwUrban: 30, above150PerPointKwRural: 28,
      loadStepKw: 0.1
    }
  },
  "LV2.1": {
    category: "LV2.1",
    applicabilityNote:
      "Non-Domestic — Schools, educational institutions. " +
      "Sanctioned-load tariff (≤10 kW): ₹7.00/u + ₹172/kW urban. " +
      "Demand-based tariff (>10 kW mandatory / ≤10 kW optional): ₹7.20/u + ₹291/kW.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 7.20 }],
    loadFixed: {
      sanctionedLoadLimitKw: 10,
      perKwUrbanLow: 172,  perKwRuralLow: 141,
      energyRatePerUnitLow: 7.00,
      perKwUrban: 291, perKwRural: 251,
      perKvaUrban: 233, perKvaRural: 201
    }
  },
  "LV2.2": {
    category: "LV2.2",
    applicabilityNote:
      "Non-Domestic — Shops, offices, hospitals etc. FY 2026-27. " +
      "SUB-TYPE A (Sanctioned-Load-Based, ≤10 kW): non-telescopic — " +
      "≤50 u → ₹6.80/u + ₹98/kW; >50 u → ₹8.2823/u + ₹153.41/kW. " +
      "SUB-TYPE B (Demand-Based): ₹7.40/u + ₹312/kW.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 7.40 }],
    loadFixed: {
      sanctionedLoadLimitKw: 10,
      consumptionSplitUnits: 50,
      perKwUrbanLow: 98,   perKwRuralLow: 83,
      /** Urban >50 u: ₹767.05 ÷ 5 kW on verified MPEZ APR-2026 bill (order summary rounds to ₹154). */
      perKwUrbanHigh: 153.41, perKwRuralHigh: 133,
      energyRatePerUnitLow: 6.80,
      /** ₹10,974.05 ÷ 1,325 u on same bill (tariff order line is often shown as ₹8.30). */
      energyRatePerUnitHigh: 8.2823,
      perKwUrban: 312, perKwRural: 230,
      perKvaUrban: 250, perKvaRural: 184
    }
  },
  "LV3": {
    category: "LV3",
    applicabilityNote: "Public Water Works & Street Light.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 6.38 }],
    ruralEnergySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 6.10 }],
    loadFixed: { perKwUrban: 389, perKwRural: 208 }
  },
  "LV4": {
    category: "LV4",
    applicabilityNote: "LT Industrial.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 7.05 }],
    loadFixed: {
      perKwUrban: 336, perKwRural: 221,
      perKvaUrban: 269, perKvaRural: 177
    }
  },
  "LV5.1": {
    category: "LV5.1",
    applicabilityNote: "Agriculture — metered. Energy slab + HP-based fixed charge.",
    energySlabs: [
      { fromUnit: 0, toUnit: 300, ratePerUnit: 5.33 },
      { fromUnit: 301, toUnit: 750, ratePerUnit: 6.36 },
      { fromUnit: 751, toUnit: null, ratePerUnit: 6.64 }
    ],
    loadFixed: {
      perKwUrbanLow: 77,
      perKwUrbanHigh: 93,
      perKwUrban: 101
    }
  },
  "LV5.2": {
    category: "LV5.2",
    applicabilityNote: "Agriculture — unmetered / flat-rate HP billing placeholder.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 0 }],
    loadFixed: { perKwUrban: 880, perKwRural: 880 }
  },
  "LV6": {
    category: "LV6",
    applicabilityNote: "EV / Battery Charging Stations.",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 7.44 }],
    loadFixed: { perKwUrban: 0, perKwRural: 0 }
  }
};

/**
 * Electricity Duty for FY 2026-27 — same slab structure as FY 2025-26.
 * LV1.2: use flat 9% model; this matches actual bills much more closely than
 * the previous 12% bracket for >100 units.
 */
export const MP_ELECTRICITY_DUTY_FY_2026_27: Record<MpTariffCategory, ElectricityDutyRule> = {
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
 * Returns true if the given bill month is in FY 2026-27 or later
 * (i.e., bill_month >= APR-2026).
 */
export function isFY2026_27OrLater(billMonth?: string | null): boolean {
  if (!billMonth) return false;
  const s = billMonth.trim().toLowerCase();

  // ISO "YYYY-MM" / "YYYY-MM-DD" — month must not be dropped when the token is numeric.
  const iso = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (iso) {
    const year = Number.parseInt(iso[1], 10);
    const monthNum = Number.parseInt(iso[2], 10);
    if (Number.isFinite(year) && year >= 2000 && year <= 2099 && monthNum >= 1 && monthNum <= 12) {
      return year > 2026 || (year === 2026 && monthNum >= 4);
    }
  }

  const MONTHS: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  const parts = s.split(/[\s\-\/]+/).filter(Boolean);
  let monthNum = 0;
  let year = 0;
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (!isNaN(n) && n >= 2000 && n <= 2099) {
      year = n;
      continue;
    }
    const mn = MONTHS[p.slice(0, 3)];
    if (mn) {
      monthNum = mn;
    }
  }
  if (!year || !monthNum) return false;
  // APR-2026 = month 4, year 2026 → fy 2026-27 starts
  return year > 2026 || (year === 2026 && monthNum >= 4);
}
