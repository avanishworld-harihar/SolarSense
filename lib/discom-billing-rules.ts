import { resolveCanonicalState } from "@/lib/discom-registry";

export type BillCollectionMode = "latest_only" | "latest_and_months_back" | "yearly_average";

export type BillingRule = {
  mode: BillCollectionMode;
  latestBillLabel: string;
  secondaryBillLabel?: string;
  secondaryOffsetMonths?: number;
  /**
   * Approximate history months present in one bill format (e.g. MP bills usually print last 6 months).
   * Used to explain how many bills are needed to cover a full year.
   */
  historyWindowMonthsPerBill?: number;
  /**
   * Total monthly coverage target for annual estimation.
   */
  targetCoverageMonths?: number;
  minBillsRequired: number;
  averagingHint: string;
};

export type BillingUploadRequirement = {
  requiredBills: number;
  secondaryOffsets: number[];
  secondaryLabels: string[];
};

const DEFAULT_RULE: BillingRule = {
  mode: "latest_only",
  latestBillLabel: "Latest Monthly Bill",
  minBillsRequired: 1,
  averagingHint: "SOL.52 uses the latest monthly bill as the baseline for this DISCOM."
};

const MP_RULE: BillingRule = {
  mode: "latest_and_months_back",
  latestBillLabel: "Latest Monthly Bill",
  secondaryBillLabel: "Bill from 6 months ago",
  secondaryOffsetMonths: 6,
  historyWindowMonthsPerBill: 6,
  targetCoverageMonths: 12,
  minBillsRequired: 2,
  averagingHint:
    "SOL.52 Seasonal Accuracy Mode: MP bills usually contain last 6 months usage, so we need latest + one bill from 6 months back for full 12-month coverage."
};

const STATE_LEVEL_RULES: Partial<Record<string, BillingRule>> = {
  "Madhya Pradesh": MP_RULE,
  "MP": MP_RULE
};

const DISCOM_CODE_OVERRIDES = new Map<string, BillingRule>([
  ["mppkvvcl", MP_RULE],
  ["mppgvvcl", MP_RULE],
  ["mpmkvvcl", MP_RULE],
  ["mppakvvcl", MP_RULE],
  ["mpcz", MP_RULE],
  ["mpez", MP_RULE],
  ["mpwz", MP_RULE]
]);

export function getBillingRule(stateInput: string, discomCodeInput: string): BillingRule {
  const code = discomCodeInput.trim().toLowerCase();
  const direct = DISCOM_CODE_OVERRIDES.get(code);
  if (direct) return direct;

  const canonicalState = resolveCanonicalState(stateInput);
  if (canonicalState && STATE_LEVEL_RULES[canonicalState]) {
    return STATE_LEVEL_RULES[canonicalState] as BillingRule;
  }

  // Future-proof extension point for yearly-average geographies.
  if (code.startsWith("yearly-avg-")) {
    return {
      mode: "yearly_average",
      latestBillLabel: "Latest annualized bill / 12-month summary",
      minBillsRequired: 1,
      averagingHint: "SOL.52 will apply yearly-average benchmarking for this DISCOM profile."
    };
  }

  return DEFAULT_RULE;
}

export function hasMinimumBills(rule: BillingRule, latestUploaded: boolean, secondaryUploaded: boolean): boolean {
  if (!latestUploaded) return false;
  if (rule.minBillsRequired <= 1) return true;
  return secondaryUploaded;
}

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

type MonthYear = { month: number; year: number };

function parseBillMonthLabel(raw: string): MonthYear | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  const monthMap: Record<string, number> = {
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
  const monthToken = text.match(/[a-z]+/)?.[0] ?? "";
  const yearToken = text.match(/(20\d{2})|(\d{2})(?!\d)/)?.[0] ?? "";
  const month = monthMap[monthToken];
  const year = yearToken.length === 2 ? 2000 + Number(yearToken) : Number(yearToken);
  if (!Number.isFinite(month) || !Number.isFinite(year) || year < 2000 || year > 2100) return null;
  return { month, year };
}

function shiftMonth(base: MonthYear, deltaMonths: number): MonthYear {
  const total = base.year * 12 + base.month + deltaMonths;
  const year = Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  return { month, year };
}

function fmtMonthYear(value: MonthYear): string {
  return `${MONTH_NAMES_SHORT[value.month]} ${value.year}`;
}

function monthDiff(a: MonthYear, b: MonthYear): number {
  return (a.year - b.year) * 12 + (a.month - b.month);
}

export function getExpectedSecondaryBillMonthLabel(rule: BillingRule, latestBillMonthLabel?: string | null): string | null {
  if (rule.mode !== "latest_and_months_back" || !rule.secondaryOffsetMonths || !latestBillMonthLabel) return null;
  const parsed = parseBillMonthLabel(latestBillMonthLabel);
  if (!parsed) return null;
  return fmtMonthYear(shiftMonth(parsed, -rule.secondaryOffsetMonths));
}

export function isSecondaryBillMonthAligned(
  rule: BillingRule,
  latestBillMonthLabel?: string | null,
  secondaryBillMonthLabel?: string | null
): boolean {
  if (rule.minBillsRequired <= 1) return true;
  if (!latestBillMonthLabel || !secondaryBillMonthLabel) return false;
  if (rule.mode !== "latest_and_months_back" || !rule.secondaryOffsetMonths) return true;
  const latest = parseBillMonthLabel(latestBillMonthLabel);
  const secondary = parseBillMonthLabel(secondaryBillMonthLabel);
  if (!latest || !secondary) return true;
  return monthDiff(latest, secondary) === rule.secondaryOffsetMonths;
}

export function getBillingUploadRequirement(
  rule: BillingRule,
  latestBillMonthLabel?: string | null,
  historyMonthsDetectedInLatestBill?: number | null
): BillingUploadRequirement {
  if (rule.mode !== "latest_and_months_back") {
    return { requiredBills: 1, secondaryOffsets: [], secondaryLabels: [] };
  }
  const detectedWindow = Number.isFinite(historyMonthsDetectedInLatestBill as number)
    ? Math.max(1, Math.round(historyMonthsDetectedInLatestBill as number))
    : 0;
  const historyWindow = detectedWindow >= 2 ? detectedWindow : Math.max(1, rule.historyWindowMonthsPerBill ?? rule.secondaryOffsetMonths ?? 6);
  const offsetStep = Math.max(1, rule.secondaryOffsetMonths ?? historyWindow);
  const targetCoverage = Math.max(rule.minBillsRequired, Math.ceil((rule.targetCoverageMonths ?? 12) / historyWindow));
  const requiredBills = Math.max(rule.minBillsRequired, targetCoverage);
  const secondaryOffsets = Array.from({ length: Math.max(0, requiredBills - 1) }, (_, i) => offsetStep * (i + 1));
  const parsedLatest = latestBillMonthLabel ? parseBillMonthLabel(latestBillMonthLabel) : null;
  const secondaryLabels = secondaryOffsets.map((offset) => {
    if (!parsedLatest) return `Bill from ${offset} months ago`;
    return `Bill around ${fmtMonthYear(shiftMonth(parsedLatest, -offset))}`;
  });
  return { requiredBills, secondaryOffsets, secondaryLabels };
}

export function isBillMonthAlignedForOffset(
  latestBillMonthLabel: string | null | undefined,
  candidateBillMonthLabel: string | null | undefined,
  offsetMonths: number
): boolean {
  if (!latestBillMonthLabel || !candidateBillMonthLabel) return false;
  const latest = parseBillMonthLabel(latestBillMonthLabel);
  const candidate = parseBillMonthLabel(candidateBillMonthLabel);
  if (!latest || !candidate) return true;
  return monthDiff(latest, candidate) === offsetMonths;
}

