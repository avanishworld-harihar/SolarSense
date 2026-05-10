/**
 * MPERC FY 2026-27 — Madhya Pradesh Retail Supply Tariff (LT)
 *
 * Codified from the MPERC Tariff Order effective April 2026.
 * Rates for LV1.2 (Domestic) are empirically VERIFIED against actual
 * MPPKVVCL (MPEZ) bills for consumer N1904016515 (APR-2026 bill).
 *
 * ─── VERIFICATION (APR-2026 bill, 419 units, 2.297 kW sanctioned load) ─────
 *
 * Energy Charges verified:
 *   50×₹4.71 + 100×₹5.67 + 150×₹7.07 + 119×₹7.17
 *   = 235.50 + 567.00 + 1060.50 + 853.23 = ₹2716.23  ← matches bill exactly
 *
 * Fixed Charge verified:
 *   ceil(418.76/15) = 28 blocks × ₹29.934/block = ₹838.15 ← matches bill
 *
 * FPPAS (APR-2026): ₹26.27 = 418.76 units × ₹0.0627/unit.
 *
 * Electricity Duty (APR-2026): ~9% model, close to printed ₹313.
 *
 * Atal Griha Jyoti Subsidy (APR-2026): ₹167.39 on the bill.
 *   Applies to all LV-1.2 consumers regardless of consumption level.
 *
 * ─── OTHER CATEGORIES ────────────────────────────────────────────────────────
 * LV2.1 / LV2.2 / LV3 / LV4 / LV5 / LV6 rates for FY 2026-27 are NOT yet
 * individually verified against actual bills. These categories retain the
 * FY 2025-26 values until verified. Update when actual bills become available.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  CategoryTariff,
  ElectricityDutyRule,
  MpTariffCategory
} from "@/lib/mp-tariff-2025-26";

export const MP_TARIFF_FY_2026_27: Record<MpTariffCategory, CategoryTariff> = {
  "LV1.1": {
    category: "LV1.1",
    applicabilityNote: "BPL / unmetered domestic — legacy lifeline tariff.",
    energySlabs: [{ fromUnit: 0, toUnit: 30, ratePerUnit: 3.33 }],
    domesticFixed: {
      upto50Urban: 32, upto50Rural: 27,
      upto150Urban: 32, upto150Rural: 27,
      above150PerPointKwUrban: 0, above150PerPointKwRural: 0,
      loadStepKw: 0.1
    }
  },
  "LV1.2": {
    category: "LV1.2",
    applicabilityNote:
      "Domestic — metered residential. FY 2026-27 telescopic slabs. " +
      "Energy and fixed-charge block rate verified from APR-2026 bill.",
    energySlabs: [
      { fromUnit: 0,   toUnit: 50,   ratePerUnit: 4.71 },
      { fromUnit: 51,  toUnit: 150,  ratePerUnit: 5.67 },
      { fromUnit: 151, toUnit: 300,  ratePerUnit: 7.07 },
      { fromUnit: 301, toUnit: null, ratePerUnit: 7.17 }
    ],
    domesticFixed: {
      upto50Urban: 80,  upto50Rural: 66,
      upto150Urban: 135, upto150Rural: 112,
      // ceil(units/15) blocks × ₹29.934 ≈ APR-2026 printed FC ₹838.15.
      above150PerPointKwUrban: 29.934, above150PerPointKwRural: 28.00,
      loadStepKw: 0.1
    }
  },
  "LV2.1": {
    category: "LV2.1",
    applicabilityNote: "Non-Domestic — Schools, educational institutions. (FY 2026-27 rates pending verification; using FY 2025-26 rates.)",
    energySlabs: [
      { fromUnit: 0,  toUnit: 50,   ratePerUnit: 6.90 },
      { fromUnit: 51, toUnit: null, ratePerUnit: 8.50 }
    ],
    loadFixed: {
      consumptionSplitUnits: 50,
      perKwUrbanLow: 94,  perKwRuralLow: 78,
      perKwUrbanHigh: 153, perKwRuralHigh: 131,
      energyRatePerUnitLow: 6.90,
      energyRatePerUnitHigh: 8.50
    }
  },
  "LV2.2": {
    category: "LV2.2",
    applicabilityNote: "Non-Domestic — Shops, offices, hospitals etc. (FY 2026-27 rates pending verification; using FY 2025-26 rates.)",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 7.50 }],
    loadFixed: {
      sanctionedLoadLimitKw: 10,
      consumptionSplitUnits: 50,
      perKwUrbanLow: 94,   perKwRuralLow: 78,
      perKwUrbanHigh: 153, perKwRuralHigh: 131,
      energyRatePerUnitLow: 6.90,
      energyRatePerUnitHigh: 8.50,
      perKwUrban: 322, perKwRural: 235,
      perKvaUrban: 258, perKvaRural: 188
    }
  },
  "LV3": {
    category: "LV3",
    applicabilityNote: "Public Water Works & Street Light. (FY 2026-27 rates pending verification.)",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 6.50 }],
    loadFixed: { perKwUrban: 101, perKwRural: 83 }
  },
  "LV4": {
    category: "LV4",
    applicabilityNote: "LT Industrial. (FY 2026-27 rates pending verification.)",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 8.80 }],
    loadFixed: {
      perKwUrban: 516, perKwRural: 516,
      perKvaUrban: 413, perKvaRural: 413
    }
  },
  "LV5.1": {
    category: "LV5.1",
    applicabilityNote: "Agriculture — metered. (FY 2026-27 rates pending verification.)",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 6.10 }],
    loadFixed: { perKwUrban: 53, perKwRural: 27 }
  },
  "LV5.2": {
    category: "LV5.2",
    applicabilityNote: "Agriculture — unmetered (HP based). (FY 2026-27 rates pending verification.)",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 0 }],
    loadFixed: { perKwUrban: 880, perKwRural: 880 }
  },
  "LV6": {
    category: "LV6",
    applicabilityNote: "EV / Battery Charging Stations. (FY 2026-27 rates pending verification.)",
    energySlabs: [{ fromUnit: 0, toUnit: null, ratePerUnit: 6.20 }],
    loadFixed: { perKwUrban: 64, perKwRural: 64 }
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
  const MONTHS: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  const parts = s.split(/[\s\-\/]+/).filter(Boolean);
  let monthNum = 0, year = 0;
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (!isNaN(n) && n >= 2000 && n <= 2099) { year = n; continue; }
    const mn = MONTHS[p.slice(0, 3)];
    if (mn) { monthNum = mn; }
  }
  if (!year || !monthNum) return false;
  // APR-2026 = month 4, year 2026 → fy 2026-27 starts
  return year > 2026 || (year === 2026 && monthNum >= 4);
}
