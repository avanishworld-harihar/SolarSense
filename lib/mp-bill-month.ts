import type { MonthlyUnits } from "@/lib/types";

const MONTH_KEYS: (keyof MonthlyUnits)[] = [
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"
];

const TOKEN_TO_INDEX: Record<string, number> = {
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

/**
 * Parse labels like "MAR-2026", "Mar 2026", "2026-03", "2026-03-15" → calendar parts.
 */
export function parseBillMonthLabel(raw: string | null | undefined): { year: number; monthIndex: number } | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const lower = s.toLowerCase();

  const iso = lower.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (iso) {
    const y = Number.parseInt(iso[1], 10);
    const m = Number.parseInt(iso[2], 10) - 1;
    if (Number.isFinite(y) && y >= 2000 && y <= 2099 && m >= 0 && m <= 11) {
      return { year: y, monthIndex: m };
    }
  }

  const parts = lower.split(/[\s\-\/]+/).filter(Boolean);
  let year = 0;
  let monthIndex = -1;
  for (const p of parts) {
    const n = Number.parseInt(p, 10);
    if (!Number.isNaN(n) && n >= 2000 && n <= 2099) {
      year = n;
      continue;
    }
    const mi = TOKEN_TO_INDEX[p.slice(0, 3)];
    if (mi !== undefined) monthIndex = mi;
  }
  if (year && monthIndex >= 0) return { year, monthIndex };
  return null;
}

/** Map "MAR-2026" → `mar` for MonthlyUnits keys. */
export function monthKeyFromBillMonthLabel(raw: string | null | undefined): keyof MonthlyUnits | null {
  const p = parseBillMonthLabel(raw);
  if (!p) return null;
  return MONTH_KEYS[p.monthIndex];
}

/**
 * ISO `YYYY-MM` for a dashboard row (Jan=0 … Dec=11) when the latest bill month
 * is `refLabel` (e.g. MAR-2026). Rows Jan..ref share ref.year; later months roll
 * to ref.year − 1 (typical MPEZ "last 12 bills" window ending Mar).
 *
 * If ref is Jan/Feb, falls back to legacy `2026-MM` (ambiguous window — avoids
 * shifting an all-2026 calendar incorrectly).
 */
export function engineBillMonthIsoForRow(rowMonthIndex: number, refLabel: string | null | undefined): string {
  const ref = parseBillMonthLabel(refLabel);
  if (!ref) return `2026-${String(rowMonthIndex + 1).padStart(2, "0")}`;
  if (ref.monthIndex < 3) {
    return `2026-${String(rowMonthIndex + 1).padStart(2, "0")}`;
  }
  const rowY = rowMonthIndex <= ref.monthIndex ? ref.year : ref.year - 1;
  return `${rowY}-${String(rowMonthIndex + 1).padStart(2, "0")}`;
}
