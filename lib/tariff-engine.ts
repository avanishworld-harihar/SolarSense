import type { TariffContext } from "@/lib/tariff-types";

function fixedFromDbTiers(units: number, tiers: NonNullable<TariffContext["fixedTiers"]>): number {
  const u = Math.max(0, units);
  const sorted = [...tiers].sort((a, b) => {
    const am = a.maxUnits ?? Infinity;
    const bm = b.maxUnits ?? Infinity;
    return am - bm;
  });
  for (const t of sorted) {
    if (t.maxUnits == null) return t.inr;
    if (u <= t.maxUnits) return t.inr;
  }
  return sorted[sorted.length - 1]?.inr ?? 0;
}

function mpFixedCharge(units: number, area: "urban" | "rural", connectedLoadKw?: number): number {
  /**
   * MPERC FY 2025-26 domestic fixed charges vary by slab and urban/rural.
   * Placeholder profile assumes urban LT domestic, ~1 kW connected load for >150 units.
   */
  if (units <= 50) return area === "rural" ? 62 : 76;
  if (units <= 150) return area === "rural" ? 106 : 129;
  const perPoint = area === "rural" ? 26 : 28;
  const loadKw = Math.max(0.1, connectedLoadKw ?? 1);
  const points = Math.ceil(loadKw * 10); // 0.1 kW block
  return points * perPoint;
}

/** §7 MPPKVVCL verified slab energy ₹ */
export function energyChargeMpSlabs(units: number): number {
  const u = Math.max(0, units);
  if (u <= 50) return u * 4.45;
  if (u <= 150) return 50 * 4.45 + (u - 50) * 5.41;
  if (u <= 300) return 50 * 4.45 + 100 * 5.41 + (u - 150) * 6.79;
  return 50 * 4.45 + 100 * 5.41 + 150 * 6.79 + (u - 300) * 6.98;
}

/** Generic walker for ordered slabs with cumulative max kWh. */
export function energyChargeFromSlabs(units: number, slabs: TariffContext["energySlabs"]): number {
  const u = Math.max(0, units);
  if (u <= 0 || slabs.length === 0) return 0;
  let prev = 0;
  let cost = 0;
  for (const s of slabs) {
    const cap = s.max == null ? Infinity : s.max;
    if (u <= prev) break;
    const segEnd = Math.min(u, cap);
    const qty = Math.max(0, segEnd - prev);
    cost += qty * s.rate;
    prev = cap;
    if (u <= cap) break;
  }
  return cost;
}

export function fixedChargeForContext(ctx: TariffContext, units: number, energySubtotal: number): number {
  switch (ctx.fixedMode) {
    case "flat":
      return ctx.fixedFlatInr ?? 0;
    case "mp_tiered":
      return mpFixedCharge(units, ctx.areaProfile ?? "urban", ctx.connectedLoadKw);
    case "db_tiered":
      return ctx.fixedTiers?.length ? fixedFromDbTiers(units, ctx.fixedTiers) : 0;
    case "percent_of_subtotal":
      return 0;
    case "none":
    default:
      return 0;
  }
}

export function estimateMonthlyBillBreakdownWithContext(
  avgMonthlyUnits: number,
  ctx: TariffContext
): { energy: number; fixed: number; duty: number; fuel: number; total: number } {
  const u = avgMonthlyUnits;
  if (u <= 0) return { energy: 0, fixed: 0, duty: 0, fuel: 0, total: 0 };

  /** Energy always from configured slabs (DB or verified fallback) — same code path for business parity */
  const energy = energyChargeFromSlabs(u, ctx.energySlabs);

  let fixed = fixedChargeForContext(ctx, u, energy);

  if (ctx.fixedMode === "percent_of_subtotal") {
    fixed = 0;
  }

  let duty = 0;
  let subtotalBeforeDuty = energy + fixed;
  const extraUnit = u * ctx.extraPerKwh;
  const fuel = u * ctx.fuelPerKwh;

  if (ctx.dutyMode === "percent_energy_plus_fixed") {
    duty = subtotalBeforeDuty * ctx.dutyRate;
  } else if (ctx.dutyMode === "per_unit_flat") {
    duty = u * ctx.dutyRate;
  } else if (ctx.dutyMode === "sur_on_energy_plus_fixed") {
    duty = subtotalBeforeDuty * ctx.dutyRate;
  }

  let subtotal =
    ctx.dutyMode === "sur_on_energy_plus_fixed"
      ? subtotalBeforeDuty + duty + extraUnit + fuel
      : subtotalBeforeDuty + duty + extraUnit + fuel;

  if (ctx.fixedMode === "percent_of_subtotal") {
    const vid = subtotal * (ctx.dutyRate || 0);
    subtotal += vid;
    duty += vid;
  }

  const total = Math.max(ctx.minBillInr, Math.round(subtotal));
  return {
    energy: Math.round(energy),
    fixed: Math.round(fixed),
    duty: Math.round(duty),
    fuel: Math.round(fuel + extraUnit),
    total
  };
}

export function monthlyBillTotalInr(avgMonthlyUnits: number, ctx: TariffContext): number {
  return estimateMonthlyBillBreakdownWithContext(avgMonthlyUnits, ctx).total;
}

/** Binary search: find kWh whose model bill ≈ target monthly ₹ */
export function estimateMonthlyKwhFromBillAmount(targetBillInr: number, ctx: TariffContext): number {
  if (targetBillInr <= 0) return 0;
  let lo = 0;
  let hi = 25000;
  while (hi - lo > 2) {
    const mid = (lo + hi) >> 1;
    const b = monthlyBillTotalInr(mid, ctx);
    if (b < targetBillInr) lo = mid;
    else hi = mid;
  }
  return lo;
}

function norm(s: string) {
  return s.trim().toLowerCase();
}

function isMpDiscomContext(stateRaw: string, discomRaw: string): boolean {
  const state = norm(stateRaw);
  const d = norm(discomRaw);
  return (
    state.includes("madhya") ||
    d.includes("mppkv") ||
    d.includes("mppgvvcl") ||
    d.includes("mpmkvvcl") ||
    d.includes("mpcz") ||
    d.includes("mpez") ||
    d.includes("mpwz")
  );
}

/** §7 + §8 defaults when Supabase has no row (still DISCOM-specific, not one generic formula). */
export function getFallbackTariffContext(stateRaw: string, discomRaw: string): TariffContext {
  const state = norm(stateRaw);
  const d = norm(discomRaw);

  if (isMpDiscomContext(stateRaw, discomRaw)) {
    return {
      source: "fallback",
      discomLabel: "MP DISCOM (FY 2025-26 seed)",
      energySlabs: [
        { max: 50, rate: 4.45 },
        { max: 150, rate: 5.41 },
        { max: 300, rate: 6.79 },
        { max: null, rate: 6.98 }
      ],
      fixedMode: "mp_tiered",
      dutyRate: 0.09,
      dutyMode: "percent_energy_plus_fixed",
      extraPerKwh: 0,
      fuelPerKwh: 0.024,
      minBillInr: 75,
      areaProfile: "urban",
      connectedLoadKw: 1,
      notes:
        "MPERC 2025-26 seed (LV-1.2): slabs 4.45/5.41/6.79/6.98; fixed uses urban/rural + connected-load model."
    };
  }

  if (state.includes("maharashtra") || d.includes("msedcl") || d.includes("mseb")) {
    return {
      source: "fallback",
      discomLabel: "MSEDCL (§7 simplified)",
      energySlabs: [{ max: null, rate: 7.0 }],
      fixedMode: "flat",
      fixedFlatInr: 130,
      dutyRate: 1.47,
      dutyMode: "per_unit_flat",
      extraPerKwh: 0,
      fuelPerKwh: 0,
      minBillInr: 0,
      notes: "MH: fixed ₹130 + ₹1.47/kWh levy (model)"
    };
  }

  if (state.includes("gujarat") || d.includes("dgvcl") || d.includes("ugvcl") || d.includes("pgvcl")) {
    return {
      source: "fallback",
      discomLabel: "Gujarat DISCOM (§7 simplified)",
      energySlabs: [{ max: null, rate: 5.2 }],
      fixedMode: "flat",
      fixedFlatInr: 30,
      dutyRate: 0.15,
      dutyMode: "sur_on_energy_plus_fixed",
      extraPerKwh: 0,
      fuelPerKwh: 0,
      minBillInr: 0,
      notes: "GJ: (energy + ₹30 fixed) + 15% Vidyut Shulk (model)"
    };
  }

  if (state.includes("delhi") || d.includes("bses") || d.includes("tata power dd")) {
    return {
      source: "fallback",
      discomLabel: "Delhi (§7 simplified)",
      energySlabs: [{ max: null, rate: 6.5 }],
      fixedMode: "flat",
      fixedFlatInr: 125,
      dutyRate: 0.08,
      dutyMode: "percent_energy_plus_fixed",
      extraPerKwh: 0,
      fuelPerKwh: 0,
      minBillInr: 0,
      notes: "Delhi: flat ₹125 fixed (assumes ~1 kW; refine with sanctioned load later)"
    };
  }

  return getFallbackTariffContext("Madhya Pradesh", "MPPKVVCL");
}

/**
 * Category-aware context hook for SOL.52:
 * LV2.2 (shops/showrooms) often differs materially from domestic LV-1 billing.
 */
export function applyTariffCategoryOverride(
  base: TariffContext,
  params: { state: string; discom: string; tariffCategory?: string; connectedLoadKw?: number; areaProfile?: "urban" | "rural" }
): TariffContext {
  const cat = (params.tariffCategory ?? "").toLowerCase();
  if (!isMpDiscomContext(params.state, params.discom)) return base;
  if (!(cat.includes("lv2") || cat.includes("shop") || cat.includes("showroom") || cat.includes("commercial"))) {
    return base;
  }

  const loadKw = Math.max(1, params.connectedLoadKw ?? 5);
  const fixedPerKw = 144; // empirically calibrated from provided LV2.2 bills (customer-specific placeholder)

  return {
    ...base,
    source: "fallback",
    discomLabel: "MP LV2.2 (SOL.52 calibrated seed)",
    energySlabs: [{ max: null, rate: 8.0 }],
    fixedMode: "flat",
    fixedFlatInr: Math.round(loadKw * fixedPerKw),
    dutyRate: 0.124,
    dutyMode: "percent_energy_plus_fixed",
    extraPerKwh: 0,
    fuelPerKwh: 0.065,
    areaProfile: params.areaProfile ?? base.areaProfile ?? "urban",
    connectedLoadKw: loadKw,
    notes:
      "Calibrated from 12-bill LV2.2 sample: ₹8/unit energy, ~12.4% duty, ~₹0.065/kWh adjustment. PF/welding penalties remain separate."
  };
}

/**
 * §8 solar sizing vs annual consumption (export factor).
 * MP 100%, Gujarat 120%, Rajasthan 130%, UP 110%, Delhi & others 110%.
 */
export function stateSizingFactor(stateRaw: string): number {
  const s = norm(stateRaw);
  if (s.includes("madhya") || s === "mp") return 1.0;
  if (s.includes("gujarat")) return 1.2;
  if (s.includes("rajasthan")) return 1.3;
  if (s.includes("uttar pradesh") || s.includes("uttarakhand")) return 1.1;
  if (s.includes("delhi")) return 1.1;
  return 1.1;
}
