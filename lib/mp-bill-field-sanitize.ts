/**
 * MP bills (MPEZ/MPCZ/MPWZ): "Billing Details" tables often stack **M.P. Govt. Subsidy Amount**
 * (decimal rupees) under column headers OCR confuses with kWh —
 * models sometimes scrape that ₹ figure into `metered_unit_consumption`
 * (“units” column illusion on the scanned layout).
 *
 * This module restores invariants: subsidy stays `mp_govt_subsidy_amount_inr`;
 * metered stays integer kWh. Non-MP callers are unaffected.
 */

import type { ParsedBillShape } from "@/lib/bill-parse";

function toNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

const BILL_MONTH_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11
};

function parseBillMonthIndex(raw?: string | null): number | null {
  const text = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!text) return null;
  const tok = text.match(/[a-z]+/)?.[0] ?? "";
  const ix = BILL_MONTH_MAP[tok.slice(0, 3)];
  return Number.isFinite(ix) ? ix : null;
}

function monthsRoughlyMatch(a?: string | null, b?: string | null): boolean {
  const ia = parseBillMonthIndex(a);
  const ib = parseBillMonthIndex(b);
  if (ia == null || ib == null) return false;
  const ya = String(a ?? "").match(/(20\d{2})/)?.[1];
  const yb = String(b ?? "").match(/(20\d{2})/)?.[1];
  if (ya && yb && ya !== yb) return false;
  return ia === ib;
}

function fractionAbs(n: number): number {
  return Math.abs(n - Math.round(n));
}

/** ₹ credits show paise tails (544.96) — LV1.2 metered monthly kWh is always a whole reading on bills we’ve seen */
function meteredLooksLikeLeakOfSubsidyRupees(m: number): boolean {
  if (!Number.isFinite(m) || m <= 0 || m >= 3500) return false;
  const fr = fractionAbs(m);
  return fr >= 0.005 && fr < 1;
}

function looksLikeIntegerKWh(u: number): boolean {
  return Number.isFinite(u) && u >= 25 && u <= 4000 && fractionAbs(u) < 1e-6;
}

export function recoverMeteredUnitsFromHistory(parsed: ParsedBillShape): number | null {
  const bm = parsed.bill_month;
  const hist = parsed.consumption_history ?? [];
  for (const row of hist) {
    const label = String(row?.month ?? "").trim();
    if (!label) continue;
    if (!monthsRoughlyMatch(label, bm)) continue;
    const uRaw = typeof row.units === "number" && Number.isFinite(row.units) ? row.units : NaN;
    if (!looksLikeIntegerKWh(uRaw)) continue;
    return Math.round(uRaw);
  }
  const bmIdx = parseBillMonthIndex(bm);
  if (bmIdx != null) {
    const key = MONTH_KEYS[bmIdx];
    const fromMonths = toNum(parsed.months?.[key]);
    if (fromMonths != null) {
      const r = Math.round(fromMonths);
      if (looksLikeIntegerKWh(r)) return r;
    }
  }
  return null;
}

function isMpBillShape(parsed: ParsedBillShape): boolean {
  const s = `${parsed.state ?? ""} ${parsed.discom ?? ""} ${parsed.address ?? ""}`.toLowerCase();
  if (/madhya|mpez|mpc|mpwz|mppkvvcl|mpmkvvcl|mppakvvcl|jabalpur|bhopal|indore/.test(s)) return true;
  const t = `${parsed.connection_type ?? ""} ${parsed.tariff_category ?? ""}`.toLowerCase();
  return /\blv\s*[-]?\s*1\s*\.?\s*2\b|domestic|light and fan/.test(t);
}

function roundInrCredit(n: number): number {
  return Math.round(n * 100) / 100;
}

function pushNotes(next: ParsedBillShape, line: string) {
  const prev = Array.isArray(next.strict_audit_notes) ? next.strict_audit_notes : [];
  next.strict_audit_notes = [...prev.filter(Boolean).map(String), line].slice(0, 30);
}

/**
 * Repairs `metered_unit_consumption` vs `mp_govt_subsidy_amount_inr` mix-ups.
 */
export function sanitizeMpMeteredVsSubsidyFields(parsed: ParsedBillShape): ParsedBillShape {
  if (!parsed || !isMpBillShape(parsed)) return parsed;

  const next: ParsedBillShape = { ...parsed };
  const prefix = "MP bill field sanitization:";

  const metered = toNum(next.metered_unit_consumption);
  if (metered != null && meteredLooksLikeLeakOfSubsidyRupees(metered)) {
    pushNotes(next, `${prefix} metered contained subsidy credit (${metered}); moved to mp_govt_subsidy; restored kWh from history.`);
    next.mp_govt_subsidy_amount_inr = -roundInrCredit(Math.abs(metered));
    next.metered_unit_consumption = recoverMeteredUnitsFromHistory(next) ?? null;
  }

  return next;
}
