/** Client-only cache for dashboard stats (SWR seed + persistence). */

export type DashboardStatsPayload = {
  totalLeads: number;
  proposalsSent: number;
  orders: number;
  installedKw: number;
  revenue: number;
  pendingPayments: number;
  recentProjects: DashboardProjectSummary[];
};

export type DashboardProjectSummary = {
  id: string;
  name: string;
  detail: string;
  capacityKw: string;
  status: "active" | "pending" | "done";
  installProgress: number;
  nextAction?: string | null;
  updatedAt?: string | null;
};

export const DASHBOARD_STATS_SWR_KEY = "/api/dashboard-stats";

const STORAGE_KEY = "ss_v2_dashboard_stats";
const SAVED_AT_KEY = "ss_v2_dashboard_stats_saved_at";

function touchDashboardSavedAt() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Milliseconds since stats were last confirmed from the network (null if unknown). */
export function getDashboardCacheAgeMs(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVED_AT_KEY);
    if (!raw) return null;
    const saved = Number(raw);
    if (!Number.isFinite(saved)) return null;
    return Date.now() - saved;
  } catch {
    return null;
  }
}

export function readDashboardStatsCache(): DashboardStatsPayload | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return undefined;
    const o = parsed as Record<string, unknown>;
    const nums = ["totalLeads", "proposalsSent", "orders", "installedKw", "revenue", "pendingPayments"] as const;
    for (const k of nums) {
      if (typeof o[k] !== "number" || !Number.isFinite(o[k])) return undefined;
    }
    const recentRaw = o.recentProjects;
    const recentProjects: DashboardProjectSummary[] = [];
    if (Array.isArray(recentRaw)) {
      for (const row of recentRaw) {
        if (!row || typeof row !== "object") continue;
        const p = row as Record<string, unknown>;
        const statusRaw = String(p.status ?? "").toLowerCase();
        if (statusRaw !== "active" && statusRaw !== "pending" && statusRaw !== "done") continue;
        recentProjects.push({
          id: String(p.id ?? ""),
          name: String(p.name ?? ""),
          detail: String(p.detail ?? ""),
          capacityKw: String(p.capacityKw ?? "—"),
          status: statusRaw as DashboardProjectSummary["status"],
          installProgress: Number(p.installProgress ?? 0) || 0,
          nextAction: p.nextAction != null ? String(p.nextAction) : null,
          updatedAt: p.updatedAt != null ? String(p.updatedAt) : null
        });
      }
    }
    return {
      totalLeads: o.totalLeads as number,
      proposalsSent: o.proposalsSent as number,
      orders: o.orders as number,
      installedKw: o.installedKw as number,
      revenue: o.revenue as number,
      pendingPayments: o.pendingPayments as number,
      recentProjects
    };
  } catch {
    return undefined;
  }
}

export function writeDashboardStatsCache(data: DashboardStatsPayload) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

function normalizeStatsPayload(d: DashboardStatsPayload): DashboardStatsPayload {
  return {
    totalLeads: d.totalLeads,
    proposalsSent: d.proposalsSent,
    orders: d.orders,
    installedKw: d.installedKw,
    revenue: d.revenue,
    pendingPayments: d.pendingPayments,
    recentProjects: Array.isArray(d.recentProjects) ? d.recentProjects : []
  };
}

/**
 * Loads dashboard stats from the API when online; on failure or offline, returns the last
 * persisted session from localStorage so the UI stays populated without a network.
 */
export async function fetchDashboardStats(path: string): Promise<DashboardStatsPayload> {
  const cached = readDashboardStatsCache();

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    if (cached) return cached;
    throw new Error("No saved dashboard yet. Open Sol.52 online once to cache your numbers.");
  }

  try {
    const url = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    url.searchParams.set("_ts", String(Date.now()));
    const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    const payload = (await response.json()) as { ok?: boolean; data?: DashboardStatsPayload & { sources?: unknown }; error?: string };
    if (!response.ok || !payload.ok || !payload.data) {
      throw new Error(payload.error ?? "Bad response");
    }
    const normalized = normalizeStatsPayload(payload.data);
    writeDashboardStatsCache(normalized);
    touchDashboardSavedAt();
    return normalized;
  } catch {
    if (cached) return cached;
    throw new Error("No saved dashboard yet. Open Sol.52 online once to cache your numbers.");
  }
}

