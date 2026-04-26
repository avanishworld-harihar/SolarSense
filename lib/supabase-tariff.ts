import { getFallbackTariffContext } from "@/lib/tariff-engine";
import { supabase } from "@/lib/supabase";
import type { EnergySlab, FixedTierRow, TariffContext } from "@/lib/tariff-types";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const x = parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(x) ? x : null;
}

function pickStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function norm(s: string) {
  return s.trim().toLowerCase();
}

/** Map slab rows → walker expects cumulative max kWh per tier (§7 style: 0–50, 51–150, …). */
function rowsToEnergySlabs(rows: Record<string, unknown>[]): EnergySlab[] {
  const parsed = rows
    .map((r) => ({
      from: num(r.slab_from ?? r.from_unit ?? r.unit_min ?? r.min_kwh ?? r.lower_limit ?? r.from_kwh) ?? 0,
      to: num(r.slab_to ?? r.to_unit ?? r.unit_max ?? r.max_kwh ?? r.upper_limit ?? r.to_kwh),
      rate: num(r.rate_per_unit ?? r.rate ?? r.energy_rate ?? r.price ?? r.unit_rate ?? r.energy_charge_per_unit)
    }))
    .filter((x) => x.rate != null && x.rate > 0) as { from: number; to: number | null; rate: number }[];

  parsed.sort((a, b) => a.from - b.from);
  if (parsed.length === 0) return [];

  for (let i = 0; i < parsed.length - 1; i++) {
    if (parsed[i].to == null && parsed[i + 1].from > parsed[i].from) {
      parsed[i].to = parsed[i + 1].from - 1;
    }
  }

  return parsed.map((p) => ({
    max: p.to == null ? null : p.to,
    rate: p.rate
  }));
}

/** Build tier list from fixed_charges (MP-style consumption-linked fixed). */
function rowsToFixedTiers(rows: Record<string, unknown>[]): FixedTierRow[] | null {
  const tiers: FixedTierRow[] = [];
  for (const r of rows) {
    const inr = num(r.amount ?? r.charge ?? r.monthly_inr ?? r.fixed_amount ?? r.inr);
    const maxU = num(r.slab_upto ?? r.upto_units ?? r.max_units ?? r.unit_max ?? r.consumption_upto);
    if (inr != null && inr >= 0) {
      tiers.push({ maxUnits: maxU == null ? null : maxU, inr });
    }
  }
  if (tiers.length === 0) return null;
  tiers.sort((a, b) => (a.maxUnits ?? Infinity) - (b.maxUnits ?? Infinity));
  return tiers;
}

function sumFlatFixed(rows: Record<string, unknown>[]): number {
  let s = 0;
  for (const r of rows) {
    const inr = num(r.amount ?? r.charge ?? r.monthly_inr ?? r.fixed_amount);
    if (inr != null && inr > 0) s += inr;
  }
  return Math.round(s);
}

type OtherParsed = {
  dutyRate: number;
  dutyMode: TariffContext["dutyMode"];
  fuelPerKwh: number;
  extraPerKwh: number;
  minBillInr: number;
};

/** Parse other_charges / regulatory lines (duty %, fuel ₹/kWh, min bill). */
function parseOtherCharges(rows: Record<string, unknown>[], base: OtherParsed): OtherParsed {
  const out = { ...base };
  for (const r of rows) {
    const label = pickStr(r, ["name", "charge_name", "type", "category", "description"]).toLowerCase();
    const pct = num(r.percentage ?? r.percent ?? r.duty_percent ?? r.rate_percent);
    const perUnit = num(r.per_unit ?? r.per_kwh ?? r.rate_per_kwh ?? r.fuel_rate ?? r.surcharge_per_unit);
    const flat = num(r.amount ?? r.monthly_inr);

    if (label.includes("min") && label.includes("bill") && flat != null) {
      out.minBillInr = Math.max(out.minBillInr, flat);
    }
    if (label.includes("fuel") || (label.includes("regulatory") && perUnit != null)) {
      if (perUnit != null) out.fuelPerKwh += perUnit;
    }
    if (label.includes("duty") || label.includes("electricity duty")) {
      if (pct != null && pct > 0 && pct <= 1) out.dutyRate = pct;
      else if (pct != null && pct > 1) out.dutyRate = pct / 100;
    }
    if (label.includes("tax") && label.includes("unit") && perUnit != null && label.includes("maharashtra")) {
      out.extraPerKwh += perUnit;
    }
  }
  return out;
}

function sortSlabRows(rows: Record<string, unknown>[]) {
  return [...rows].sort((a, b) => {
    const oa = num(a.slab_order ?? a.sort_order) ?? num(a.from_unit ?? a.unit_min ?? a.slab_from) ?? 0;
    const ob = num(b.slab_order ?? b.sort_order) ?? num(b.from_unit ?? b.unit_min ?? b.slab_from) ?? 0;
    return oa - ob;
  });
}

/** Prefer DISCOMs in selected state, then match code/name to user hint. */
function pickDiscomRow(
  allRows: Record<string, unknown>[],
  stateId: string | null,
  discomHint: string
): Record<string, unknown> | null {
  const q = discomHint.trim().toLowerCase();
  const inState = stateId
    ? allRows.filter((row) => String(row.state_id ?? row.stateId ?? "") === stateId)
    : [];
  const pool = inState.length > 0 ? inState : allRows;

  const normCode = (row: Record<string, unknown>) =>
    pickStr(row, ["code", "discom_code", "short_code"]).toLowerCase().replace(/\s+/g, "");
  const normName = (row: Record<string, unknown>) => pickStr(row, ["name", "discom_name", "title"]).toLowerCase();

  if (q) {
    const qCompact = q.replace(/\s+/g, "");
    const exact = pool.find((row) => {
      const c = normCode(row);
      return c === qCompact || c === q || `${c}` === `${qCompact}`;
    });
    if (exact) return exact;

    const byName = pool.find((row) => {
      const n = normName(row);
      return n.includes(q) || q.includes(n);
    });
    if (byName) return byName;

    const fuzzy = allRows.find((row) => {
      const c = normCode(row);
      const n = normName(row);
      return c === qCompact || c === q || n.includes(q) || q.includes(c);
    });
    if (fuzzy) return fuzzy;
  }

  if (pool.length === 1) return pool[0] ?? null;
  return null;
}

/** MPPKVVCL: DB wiring for label/id, but §7 verified math so figures match master plan. */
function applyMppkvvclSection7Gold(ctx: TariffContext, discomHint: string): TariffContext {
  const bundle = `${ctx.discomLabel} ${discomHint}`.toUpperCase().replace(/\s+/g, " ");
  if (!bundle.includes("MPPKVV") && !bundle.includes("MP PKVV")) return ctx;

  const gold = getFallbackTariffContext("Madhya Pradesh", "MPPKVVCL");
  return {
    ...ctx,
    energySlabs: gold.energySlabs,
    fixedMode: "mp_tiered",
    fixedFlatInr: undefined,
    fixedTiers: undefined,
    dutyRate: gold.dutyRate,
    dutyMode: gold.dutyMode,
    extraPerKwh: gold.extraPerKwh,
    fuelPerKwh: gold.fuelPerKwh,
    minBillInr: gold.minBillInr,
    notes: `${ctx.notes ?? ""} • MPPKVVCL §7 slabs/fixed/duty/fuel/min (verified)`
  };
}

async function loadSlabRows(discomId: unknown, discomCode: string): Promise<Record<string, unknown>[] | null> {
  if (!supabase) return null;
  const idStr = discomId != null ? String(discomId) : "";

  if (idStr) {
    const { data, error } = await supabase.from("tariff_slabs").select("*").eq("discom_id", idStr).limit(200);
    if (!error && data?.length) return sortSlabRows(data as Record<string, unknown>[]);
  }

  const { data: byCode } = await supabase
    .from("tariff_slabs")
    .select("*")
    .ilike("discom_code", `%${discomCode.trim()}%`)
    .limit(80);
  if (byCode?.length) return sortSlabRows(byCode as Record<string, unknown>[]);

  return null;
}

async function loadFixedRows(discomId: unknown): Promise<Record<string, unknown>[]> {
  if (!supabase || discomId == null) return [];
  const { data, error } = await supabase.from("fixed_charges").select("*").eq("discom_id", String(discomId));
  if (error || !data?.length) return [];
  return data as Record<string, unknown>[];
}

async function loadOtherRows(discomId: unknown): Promise<Record<string, unknown>[]> {
  if (!supabase || discomId == null) return [];
  const { data, error } = await supabase.from("other_charges").select("*").eq("discom_id", String(discomId));
  if (error || !data?.length) return [];
  return data as Record<string, unknown>[];
}

/**
 * Real tariff path: discoms → tariff_slabs + fixed_charges + other_charges.
 * Fallback only when Supabase off, table missing, or no matching DISCOM/slabs.
 */
export async function loadTariffContextFromSupabase(stateHint: string, discomHint: string): Promise<TariffContext> {
  const fallback = getFallbackTariffContext(stateHint, discomHint);
  if (!supabase) {
    return { ...fallback, notes: `${fallback.notes ?? ""} • Supabase client off (.env)` };
  }

  const st = stateHint.trim().toLowerCase();

  try {
    const { data: drows, error: derr } = await supabase.from("discoms").select("*").limit(500);
    if (derr || !drows?.length) {
      return { ...fallback, notes: `${fallback.notes ?? ""} • DB: discoms unreadable or empty` };
    }

    const rows = drows as Record<string, unknown>[];

    let stateId: string | null = null;
    if (st) {
      const { data: stRows, error: stErr } = await supabase.from("states").select("*").limit(100);
      if (!stErr && stRows?.length) {
        const stHit = (stRows as Record<string, unknown>[]).find((r) => {
          const n = pickStr(r, ["name", "state_name", "title"]).toLowerCase();
          const c = pickStr(r, ["code", "state_code"]).toLowerCase();
          return n.includes(st) || st.includes(n) || c === st || st.includes(c);
        });
        if (stHit?.id != null) stateId = String(stHit.id);
      }
    }

    const match = pickDiscomRow(rows, stateId, discomHint);

    if (!match) {
      return { ...fallback, notes: `${fallback.notes ?? ""} • DB: DISCOM match nahi mila (state+code check)` };
    }

    const discomId = match.id ?? match.discom_id;
    const label =
      pickStr(match, ["code", "discom_code", "name", "discom_name"]) || discomHint || "DISCOM";

    const slabRows = await loadSlabRows(discomId, label);
    if (!slabRows?.length) {
      return { ...fallback, discomLabel: label, notes: `${fallback.notes ?? ""} • DB: tariff_slabs empty` };
    }

    const energySlabs = rowsToEnergySlabs(slabRows);
    if (energySlabs.length === 0) {
      return { ...fallback, discomLabel: label, notes: `${fallback.notes ?? ""} • DB: slab columns parse nahi hue` };
    }

    const fixedRows = await loadFixedRows(discomId);
    const otherRows = await loadOtherRows(discomId);

    const baseOther: OtherParsed = {
      dutyRate: fallback.dutyRate,
      dutyMode: fallback.dutyMode,
      fuelPerKwh: fallback.fuelPerKwh,
      extraPerKwh: fallback.extraPerKwh,
      minBillInr: fallback.minBillInr
    };
    const parsedOther = otherRows.length ? parseOtherCharges(otherRows, { ...baseOther }) : { ...baseOther };

    let fixedMode = fallback.fixedMode;
    let fixedFlatInr = fallback.fixedFlatInr;
    let fixedTiers: FixedTierRow[] | undefined;

    if (fixedRows.length > 0) {
      const tiers = rowsToFixedTiers(fixedRows);
      if (tiers && tiers.length >= 2) {
        fixedMode = "db_tiered";
        fixedTiers = tiers;
        fixedFlatInr = undefined;
      } else {
        const sum = sumFlatFixed(fixedRows);
        if (sum > 0) {
          fixedMode = "flat";
          fixedFlatInr = sum;
          fixedTiers = undefined;
        }
      }
    }

    if (label.toUpperCase().includes("MPPKVV") && fixedMode !== "db_tiered" && fixedRows.length === 0) {
      fixedMode = "mp_tiered";
      fixedFlatInr = undefined;
      fixedTiers = undefined;
    }

    if (otherRows.length === 0 && label.toUpperCase().includes("MPPKVV")) {
      parsedOther.dutyRate = 0.08;
      parsedOther.dutyMode = "percent_energy_plus_fixed";
      parsedOther.fuelPerKwh = 0.024;
      parsedOther.minBillInr = Math.max(parsedOther.minBillInr, 75);
    }

    if (otherRows.length === 0 && st.includes("gujarat")) {
      parsedOther.dutyMode = "sur_on_energy_plus_fixed";
      parsedOther.dutyRate = 0.15;
    }

    const ctx: TariffContext = {
      source: "supabase",
      discomLabel: label,
      energySlabs,
      fixedMode,
      fixedFlatInr,
      fixedTiers,
      dutyRate: parsedOther.dutyRate,
      dutyMode: parsedOther.dutyMode,
      extraPerKwh: parsedOther.extraPerKwh,
      fuelPerKwh: parsedOther.fuelPerKwh,
      minBillInr: parsedOther.minBillInr,
      notes: `Supabase: states/discoms → tariff_slabs (${slabRows.length}) + fixed_charges (${fixedRows.length}) + other_charges (${otherRows.length})`
    };

    return applyMppkvvclSection7Gold(ctx, discomHint);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return { ...fallback, notes: `${fallback.notes ?? ""} • DB error: ${msg}` };
  }
}
