/**
 * Tariff context drives bill math (§7) and pairs with state sizing (§8) in solar-engine.
 * `source` tells UI whether numbers came from Supabase or verified fallbacks.
 */
export type TariffSource = "supabase" | "fallback";

/** Inclusive slab: units in (prevMax, max] charged at rate. First slab starts at 0. */
export type EnergySlab = {
  max: number | null;
  rate: number;
};

export type FixedChargeMode = "mp_tiered" | "flat" | "percent_of_subtotal" | "none" | "db_tiered";

/** DB fixed rows: apply first tier where units ≤ max (null max = catch-all). */
export type FixedTierRow = { maxUnits: number | null; inr: number };

export type TariffContext = {
  source: TariffSource;
  /** DISCOM code or name for display */
  discomLabel: string;
  /** Slabs ordered low → high; last slab max null = infinity */
  energySlabs: EnergySlab[];
  fixedMode: FixedChargeMode;
  /** flat INR / month when fixedMode === flat */
  fixedFlatInr?: number;
  /** When fixedMode === db_tiered — from fixed_charges table */
  fixedTiers?: FixedTierRow[];
  /** duty as decimal e.g. 0.08 for 8% on (energy+fixed) when dutyMode percent_base */
  dutyRate: number;
  dutyMode:
    | "percent_energy_plus_fixed"
    | "per_unit_flat"
    | "none"
    /** e.g. Gujarat: (energy + fixed) × (1 + rate) */
    | "sur_on_energy_plus_fixed";
  /** extra ₹/kWh after energy slabs (e.g. Maharashtra “tax” line) */
  extraPerKwh: number;
  /** fuel / regulatory surcharge ₹/kWh */
  fuelPerKwh: number;
  minBillInr: number;
  /** Optional profile context for DISCOM-specific fixed-charge math. */
  areaProfile?: "urban" | "rural";
  /** Connected/sanctioned load in kW used where fixed charge is load-linked. */
  connectedLoadKw?: number;
  notes?: string;
};
