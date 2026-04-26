import type { DashboardStatsPayload } from "@/lib/dashboard-stats-client";
import type { AppLocale } from "@/lib/state-to-locale";
import { translate } from "@/lib/translations";

const PREV_KEY = "ss_v1_dashboard_trend_baseline";

export type MetricTrendKey =
  | "totalLeads"
  | "proposalsSent"
  | "orders"
  | "installedKw"
  | "revenue"
  | "pendingPayments";

export type MetricTrendLines = Record<MetricTrendKey, string | null>;
export type MetricDeltaLines = Record<MetricTrendKey, number | null>;

function readBaseline(): DashboardStatsPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREV_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    const keys: MetricTrendKey[] = [
      "totalLeads",
      "proposalsSent",
      "orders",
      "installedKw",
      "revenue",
      "pendingPayments"
    ];
    const out: Partial<DashboardStatsPayload> = {};
    for (const k of keys) {
      if (typeof o[k] !== "number" || !Number.isFinite(o[k])) return null;
      out[k] = o[k] as number;
    }
    return out as DashboardStatsPayload;
  } catch {
    return null;
  }
}

export function writeTrendBaseline(cur: DashboardStatsPayload) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREV_KEY, JSON.stringify(cur));
  } catch {
    /* */
  }
}

function numTrend(
  prevVal: number | null,
  curVal: number,
  up: (n: number) => string,
  down: (n: number) => string,
  flat: string
): string | null {
  if (prevVal === null) return null;
  const d = curVal - prevVal;
  if (d > 0) return up(d);
  if (d < 0) return down(-d);
  return flat;
}

function numDelta(prevVal: number | null, curVal: number): number | null {
  if (prevVal === null) return null;
  return curVal - prevVal;
}

/** Compare to last saved baseline; caller should call `writeTrendBaseline` after displaying. */
export function buildMetricTrendLines(cur: DashboardStatsPayload, locale: AppLocale): MetricTrendLines {
  const prev = readBaseline();
  const tr = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);

  return {
    totalLeads: numTrend(
      prev ? prev.totalLeads : null,
      cur.totalLeads,
      (n) => tr("dashboard_trendLeadsUp", { n }),
      (n) => tr("dashboard_trendLeadsDown", { n }),
      tr("dashboard_trendFlatLeads")
    ),
    proposalsSent: numTrend(
      prev ? prev.proposalsSent : null,
      cur.proposalsSent,
      (n) => tr("dashboard_trendProposalsUp", { n }),
      (n) => tr("dashboard_trendProposalsDown", { n }),
      tr("dashboard_trendFlatGeneric")
    ),
    orders: numTrend(
      prev ? prev.orders : null,
      cur.orders,
      (n) => tr("dashboard_trendOrdersUp", { n }),
      (n) => tr("dashboard_trendOrdersDown", { n }),
      tr("dashboard_trendFlatGeneric")
    ),
    installedKw: numTrend(
      prev ? prev.installedKw : null,
      cur.installedKw,
      (n) => tr("dashboard_trendKwUp", { n }),
      (n) => tr("dashboard_trendKwDown", { n }),
      tr("dashboard_trendFlatGeneric")
    ),
    revenue: numTrend(
      prev ? prev.revenue : null,
      cur.revenue,
      (n) => tr("dashboard_trendRevenueUp", { n: Math.round(n) }),
      (n) => tr("dashboard_trendRevenueDown", { n: Math.round(n) }),
      tr("dashboard_trendFlatGeneric")
    ),
    pendingPayments: numTrend(
      prev ? prev.pendingPayments : null,
      cur.pendingPayments,
      (n) => tr("dashboard_trendPendingUp", { n: Math.round(n) }),
      (n) => tr("dashboard_trendPendingDown", { n: Math.round(n) }),
      tr("dashboard_trendFlatGeneric")
    )
  };
}

export function buildMetricDeltaLines(cur: DashboardStatsPayload): MetricDeltaLines {
  const prev = readBaseline();
  return {
    totalLeads: numDelta(prev ? prev.totalLeads : null, cur.totalLeads),
    proposalsSent: numDelta(prev ? prev.proposalsSent : null, cur.proposalsSent),
    orders: numDelta(prev ? prev.orders : null, cur.orders),
    installedKw: numDelta(prev ? prev.installedKw : null, cur.installedKw),
    revenue: numDelta(prev ? prev.revenue : null, cur.revenue),
    pendingPayments: numDelta(prev ? prev.pendingPayments : null, cur.pendingPayments)
  };
}
