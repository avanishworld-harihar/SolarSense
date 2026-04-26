import type { ParsedBillShape } from "@/lib/bill-parse";

const MONTH_TO_KEY: Record<string, keyof NonNullable<ParsedBillShape["months"]>> = {
  jan: "jan",
  january: "jan",
  feb: "feb",
  february: "feb",
  mar: "mar",
  march: "mar",
  apr: "apr",
  april: "apr",
  may: "may",
  jun: "jun",
  june: "jun",
  jul: "jul",
  july: "jul",
  aug: "aug",
  august: "aug",
  sep: "sep",
  sept: "sep",
  september: "sep",
  oct: "oct",
  october: "oct",
  nov: "nov",
  november: "nov",
  dec: "dec"
  ,
  december: "dec"
};

type MonthStamp = { raw: string; key: keyof NonNullable<ParsedBillShape["months"]>; monthIndex: number; year: number; pos: number };

function toMonthIndex(key: keyof NonNullable<ParsedBillShape["months"]>): number {
  return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(key);
}

function normalizeYear(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (raw.length === 2) return n >= 70 ? 1900 + n : 2000 + n;
  return n;
}

function normalizeMonthToken(raw: string): MonthStamp | null {
  const m = raw.match(/\b(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:T|TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\s*[-/ ]\s*'?(\d{2,4})\b/i);
  if (!m) return null;
  const key = MONTH_TO_KEY[m[1].toLowerCase()];
  const year = normalizeYear(m[2]);
  if (!key || year === null || !Number.isFinite(year)) return null;
  return { raw: `${key.toUpperCase()}-${year}`, key, monthIndex: toMonthIndex(key), year, pos: -1 };
}

function monthDiff(from: MonthStamp, to: MonthStamp): number {
  return (from.year - to.year) * 12 + (from.monthIndex - to.monthIndex);
}

function collectMonthStamps(text: string): MonthStamp[] {
  const out: MonthStamp[] = [];
  const rx = /\b(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:T|TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\s*[-/ ]\s*'?(\d{2,4})\b/gi;
  let m: RegExpExecArray | null = rx.exec(text);
  while (m) {
    const parsed = normalizeMonthToken(`${m[1]}-${m[2]}`);
    if (parsed) out.push({ ...parsed, pos: m.index });
    m = rx.exec(text);
  }
  return out;
}

function detectLatestBillMonth(text: string, months: MonthStamp[]): MonthStamp | null {
  const byLabel = text.match(/Bill\s*Month[:\s-]*([A-Z]{3,9}\s*[-/ ]\s*'?\d{2,4})/i)?.[1];
  if (byLabel) {
    const parsed = normalizeMonthToken(byLabel);
    if (parsed) return parsed;
  }
  return (
    [...months].sort((a, b) => {
      const am = a.year * 12 + a.monthIndex;
      const bm = b.year * 12 + b.monthIndex;
      return bm - am;
    })[0] ?? null
  );
}

type NumberStamp = { value: number; pos: number };

function parseUnitToken(raw: string): number | null {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > 2000) return null;
  if (n >= 1900 && n <= 2100 && Number.isInteger(n)) return null; // likely year
  return Math.round(n);
}

function collectNumberStamps(text: string): NumberStamp[] {
  const out: NumberStamp[] = [];
  const rx = /\b\d{1,4}(?:\.\d{1,2})?\b/g;
  let m: RegExpExecArray | null = rx.exec(text);
  while (m) {
    const start = m.index;
    const end = start + m[0].length;
    const prevChar = start > 0 ? text[start - 1] : "";
    const nextChar = end < text.length ? text[end] : "";
    if (prevChar === "-" || nextChar === "-" || prevChar === "/") {
      m = rx.exec(text);
      continue; // likely date chunks like 26-01-2026
    }
    const parsed = parseUnitToken(m[0]);
    if (parsed) out.push({ value: parsed, pos: start });
    m = rx.exec(text);
  }
  return out;
}

function extractLastSixMonthsSection(text: string): string {
  const match = /Last\s+(?:Six|6)\s+Months?\s+Consumption/i.exec(text);
  if (!match) return text;
  const start = Math.max(0, match.index - 120);
  return text.slice(start, start + 3400);
}

function extractMeteredUnitForLatest(text: string): number | null {
  const direct = text.match(/Metered\s*Unit\s*Consumption[\s:]*([0-9]{1,4}(?:\.[0-9]{1,2})?)/i)?.[1];
  const parsedDirect = direct ? parseUnitToken(direct) : null;
  if (parsedDirect) return parsedDirect;
  const reverse = text.match(/([0-9]{1,4}(?:\.[0-9]{1,2})?)\s*(?:Metered\s*Unit\s*Consumption|Final\s*Consumption)/i)?.[1];
  return reverse ? parseUnitToken(reverse) : null;
}

function extractUnitsByMonth(text: string, targetMonths: MonthStamp[]): Partial<Record<keyof NonNullable<ParsedBillShape["months"]>, number>> {
  const monthsMap: Partial<Record<keyof NonNullable<ParsedBillShape["months"]>, number>> = {};
  const monthHits = collectMonthStamps(text);
  const numberHits = collectNumberStamps(text);
  const usedNumberIndexes = new Set<number>();
  const sortedTargets = [...targetMonths].sort((a, b) => a.pos - b.pos);

  for (const target of sortedTargets) {
    let bestIdx = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < monthHits.length; i += 1) {
      const hit = monthHits[i];
      if (hit.key !== target.key || hit.year !== target.year) continue;
      for (let j = 0; j < numberHits.length; j += 1) {
        if (usedNumberIndexes.has(j)) continue;
        const n = numberHits[j];
        const distance = Math.abs(n.pos - hit.pos);
        if (distance > 160) continue;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIdx = j;
        }
      }
    }
    if (bestIdx >= 0) {
      monthsMap[target.key] = numberHits[bestIdx].value;
      usedNumberIndexes.add(bestIdx);
    }
  }

  return monthsMap;
}

function buildPreviousMonths(latest: MonthStamp, count: number): MonthStamp[] {
  const out: MonthStamp[] = [];
  for (let i = 1; i <= count; i += 1) {
    const total = latest.year * 12 + latest.monthIndex - i;
    const year = Math.floor(total / 12);
    const monthIndex = ((total % 12) + 12) % 12;
    const key = (["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const)[monthIndex];
    out.push({
      raw: `${key.toUpperCase()}-${year}`,
      key,
      monthIndex,
      year,
      pos: -1
    });
  }
  return out;
}

function extractTextFromRawPdfBytes(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const textFragments = raw.match(/[A-Za-z0-9\-/:.() ]{4,}/g) ?? [];
  return textFragments.join("\n");
}

async function extractTextWithPdfParse(buffer: Buffer): Promise<string> {
  const nativeImport = new Function("specifier", "return import(specifier);") as (specifier: string) => Promise<unknown>;
  const mod = (await nativeImport("pdf-parse")) as {
    PDFParse?: new (input: { data: Buffer; worker?: boolean; disableWorker?: boolean }) => {
      getText: () => Promise<{ text?: string }>;
      destroy?: () => Promise<void> | void;
    };
    default?: unknown;
  };
  const parserClass =
    mod.PDFParse ?? ((mod.default as { PDFParse?: typeof mod.PDFParse } | undefined)?.PDFParse ?? undefined);
  if (!parserClass) throw new Error("pdf-parse parser class unavailable");

  const parser = new parserClass({ data: buffer, worker: false, disableWorker: true });
  const result = await parser.getText();
  await parser.destroy?.();
  const text = String(result?.text ?? "").trim();
  if (!text) {
    throw new Error("pdf-parse returned empty text");
  }
  return text;
}

function mergeTextUnits(
  fullText: string,
  latest: MonthStamp,
  scopedMonths: MonthStamp[]
): Partial<Record<keyof NonNullable<ParsedBillShape["months"]>, number>> {
  const fromSection = extractUnitsByMonth(extractLastSixMonthsSection(fullText), scopedMonths);
  const fromWholeBill = extractUnitsByMonth(fullText, scopedMonths);
  const latestMetered = extractMeteredUnitForLatest(fullText);
  const merged = applyMpSixMonthTableHeuristic(fullText, { ...fromWholeBill, ...fromSection });
  if (latestMetered && latestMetered > 0) merged[latest.key] = latestMetered;
  return merged;
}

function applyMpSixMonthTableHeuristic(
  text: string,
  seed: Partial<Record<keyof NonNullable<ParsedBillShape["months"]>, number>>
): Partial<Record<keyof NonNullable<ParsedBillShape["months"]>, number>> {
  const section = extractLastSixMonthsSection(text);
  const headingIdx = section.search(/Last\s+(?:Six|6)\s+Months?\s+Consumption/i);
  const headerIdx = section.search(/Unit\s+Reading\s+Date/i);
  if (headingIdx < 0 || headerIdx < 0 || headerIdx <= headingIdx) return seed;

  const monthArea = section.slice(headerIdx, Math.min(section.length, headerIdx + 650));
  const orderedMonths = collectMonthStamps(monthArea).filter((m, idx, arr) =>
    arr.findIndex((x) => x.key === m.key && x.year === m.year) === idx
  );
  if (orderedMonths.length === 0) return seed;

  const numbersArea = section.slice(Math.max(0, headingIdx - 80), headerIdx);
  const pairUnits: number[] = [];
  const pairRegex = /(\d{2,4}(?:\.\d+)?)\s+\d{4,6}\b/g;
  let pairMatch: RegExpExecArray | null = pairRegex.exec(numbersArea);
  while (pairMatch) {
    const parsed = parseUnitToken(pairMatch[1]);
    if (parsed) pairUnits.push(parsed);
    pairMatch = pairRegex.exec(numbersArea);
  }
  const leadingUnits: number[] = [];
  const leadingRegex = /\b\d{2,4}(?:\.\d+)?\b/g;
  const headingBand = section.slice(Math.max(0, headingIdx - 120), headingIdx);
  let leadMatch: RegExpExecArray | null = leadingRegex.exec(headingBand);
  while (leadMatch) {
    const parsed = parseUnitToken(leadMatch[0]);
    if (parsed) leadingUnits.push(parsed);
    leadMatch = leadingRegex.exec(headingBand);
  }

  const allUnits = [...leadingUnits.slice(-2), ...pairUnits];
  if (allUnits.length === 0) return seed;

  const take = Math.min(orderedMonths.length, allUnits.length);
  const targetMonths = orderedMonths.slice(-take);
  const targetUnits = allUnits.slice(-take);
  const merged = { ...seed };
  for (let i = 0; i < take; i += 1) {
    const month = targetMonths[i];
    const units = targetUnits[i];
    if (!merged[month.key] && units > 0) merged[month.key] = units;
  }
  return merged;
}

export async function parsePdfBillFallback(base64Data: string): Promise<ParsedBillShape | null> {
  const buffer = Buffer.from(base64Data, "base64");
  try {
    const text = (await extractTextWithPdfParse(buffer)) || extractTextFromRawPdfBytes(buffer);
    if (!text) return null;

    const monthStamps = collectMonthStamps(text);
    const latest = detectLatestBillMonth(text, monthStamps);
    if (!latest) return null;

    const expectedHistoryMonths = [latest, ...buildPreviousMonths(latest, 5)];
    const scopedMonths = expectedHistoryMonths.filter((m) => {
      const delta = monthDiff(latest, m);
      return delta >= 0 && delta <= 11;
    });
    const unitsByMonth = mergeTextUnits(text, latest, scopedMonths);
    const consumption_history = scopedMonths
      .map((m) => {
        const units = unitsByMonth[m.key];
        return units && units > 0 ? { month: m.raw, units } : null;
      })
      .filter(Boolean) as NonNullable<ParsedBillShape["consumption_history"]>;

    const billMonth = latest.raw;
    const months: NonNullable<ParsedBillShape["months"]> = {};
    for (const row of consumption_history) {
      const parsed = normalizeMonthToken(row.month);
      if (parsed) months[parsed.key] = row.units;
    }

    return {
      bill_month: billMonth,
      months,
      consumption_history,
      format_memory: "Parsed from PDF fallback: Last Six Months Consumption table"
    };
  } catch {
    try {
      const text = extractTextFromRawPdfBytes(buffer);
      if (!text) return null;
      const monthStamps = collectMonthStamps(text);
      const latest = detectLatestBillMonth(text, monthStamps);
      if (!latest) return null;
      const expectedHistoryMonths = [latest, ...buildPreviousMonths(latest, 5)];
      const scopedMonths = expectedHistoryMonths.filter((m) => {
        const delta = monthDiff(latest, m);
        return delta >= 0 && delta <= 11;
      });
      const unitsByMonth = mergeTextUnits(text, latest, scopedMonths);
      const consumption_history = scopedMonths
        .map((m) => {
          const units = unitsByMonth[m.key];
          return units && units > 0 ? { month: m.raw, units } : null;
        })
        .filter(Boolean) as NonNullable<ParsedBillShape["consumption_history"]>;
      const months: NonNullable<ParsedBillShape["months"]> = {};
      for (const row of consumption_history) {
        const parsed = normalizeMonthToken(row.month);
        if (parsed) months[parsed.key] = row.units;
      }
      return {
        bill_month: latest.raw,
        months,
        consumption_history,
        format_memory: "Parsed from raw PDF text fallback: Last Six Months Consumption table"
      };
    } catch {
      return null;
    }
  }
}
