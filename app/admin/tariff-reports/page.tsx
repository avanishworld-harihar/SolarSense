"use client";

import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";

type ReportStatus = "pending_admin_approval" | "verified" | "ignored" | "false_positive";

type AdminTariffReport = {
  id: string;
  table: string;
  installerName: string;
  installerState: string;
  activeTariff: string;
  source: string;
  status: ReportStatus;
  detectedRates: number[];
  databaseRates: number[];
  note: string | null;
  reportedAt: string | null;
  updatedAt: string | null;
  reviewedBy: string | null;
};

async function fetchReports(url: string): Promise<AdminTariffReport[]> {
  const res = await fetch(url, { cache: "no-store" });
  const payload = (await res.json()) as { ok?: boolean; data?: AdminTariffReport[]; error?: string };
  if (!res.ok || !payload.ok) throw new Error(payload.error ?? "Could not load tariff reports.");
  return payload.data ?? [];
}

export default function AdminTariffReportsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"pending_admin_approval" | "all" | "verified" | "ignored" | "false_positive">(
    "pending_admin_approval"
  );
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});

  const reportsUrl = `/api/admin/tariff-reports?status=${encodeURIComponent(statusFilter)}&limit=120`;
  const { data, error, isLoading, mutate } = useSWR<AdminTariffReport[]>(reportsUrl, fetchReports, {
    revalidateOnFocus: true
  });

  const visibleReports = useMemo(() => (data ?? []).filter((r) => !hiddenIds.includes(r.id)), [data, hiddenIds]);
  const pendingCount = useMemo(
    () => visibleReports.filter((r) => r.status === "pending_admin_approval").length,
    [visibleReports]
  );
  const discoveryPendingReports = useMemo(
    () => visibleReports.filter((r) => r.status === "pending_admin_approval" && isDiscoveryReport(r)),
    [visibleReports]
  );
  const discoveryCount = discoveryPendingReports.length;
  const verifiedCount = useMemo(() => visibleReports.filter((r) => r.status === "verified").length, [visibleReports]);
  const verifiedThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return visibleReports.filter((r) => r.status === "verified" && Date.parse(r.updatedAt ?? r.reportedAt ?? "") >= weekAgo).length;
  }, [visibleReports]);
  const totalCoverage = useMemo(() => new Set(visibleReports.map((r) => r.activeTariff)).size, [visibleReports]);
  const trendSeries = useMemo(() => buildThirtyDayTrend(visibleReports), [visibleReports]);
  const selectedReport =
    visibleReports.find((r) => r.id === selectedReportId) ??
    visibleReports.find((r) => r.status === "pending_admin_approval") ??
    visibleReports[0] ??
    null;

  async function reviewReportAction(report: AdminTariffReport, action: "approve" | "ignore" | "false_positive") {
    if (approvingId) return;
    setApprovingId(report.id);
    setHiddenIds((prev) => [...prev, report.id]);
    try {
      const res = await fetch("/api/admin/tariff-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: report.id,
          table: report.table,
          action,
          reviewedBy: "admin",
          reviewNote: actionNotes[report.id]?.trim() || null
        })
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "Approve failed");
      setActionNotes((prev) => {
        const next = { ...prev };
        delete next[report.id];
        return next;
      });
      setToast(action === "approve" ? "Approved & Synced" : action === "ignore" ? "Marked as Ignored" : "Marked as False Positive");
      await mutate();
    } catch (e) {
      setHiddenIds((prev) => prev.filter((id) => id !== report.id));
      setToast(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setApprovingId(null);
      window.setTimeout(() => setToast(null), 2200);
    }
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <AppShell title="Admin Tariff Reports">
      <div className="relative space-y-3">
        <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(circle_at_20%_15%,rgba(56,189,248,0.18),transparent_36%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.18),transparent_38%),radial-gradient(circle_at_50%_90%,rgba(59,130,246,0.1),transparent_40%)]" />

        <AnimatePresence>
          {toast ? (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="fixed left-1/2 top-4 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-300/80 bg-emerald-50/95 px-4 py-2 text-xs font-extrabold text-emerald-800 shadow-lg backdrop-blur-xl"
            >
              <CheckCircle2 className="h-4 w-4" />
              {toast}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="glass-surface rounded-2xl border border-white/55 bg-white/45 p-3 backdrop-blur-xl">
          <p className="text-sm font-extrabold text-brand-900">Self-learning tariff queue</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            Pending reports are generated from AI bill scans and manual installer reports. Approve only after verification.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatChip label="Pending" value={String(pendingCount)} tone="amber" />
            <StatChip label="Verified This Week" value={String(verifiedThisWeek)} tone="emerald" />
            <StatChip label="Total DISCOM Coverage" value={String(totalCoverage)} tone="indigo" />
            <StatChip label="Visible Rows" value={String(visibleReports.length)} tone="slate" />
          </div>
          <div className="mt-2">
            <StatChip label="Discovery Inbox" value={String(discoveryCount)} tone="indigo" />
          </div>

          <div className="mt-3 rounded-xl border border-white/70 bg-white/70 p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">30-day verification trend</p>
              <span className="text-[11px] font-semibold text-slate-500">{verifiedCount} verified total</span>
            </div>
            <TrendLine data={trendSeries} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { id: "pending_admin_approval", label: "Pending" },
              { id: "all", label: "All" },
              { id: "verified", label: "Verified" },
              { id: "ignored", label: "Ignored" },
              { id: "false_positive", label: "False Positive" }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id as typeof statusFilter)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                  statusFilter === f.id
                    ? "border-brand-500 bg-brand-50 text-brand-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
                )}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-400"
            >
              Logout admin
            </button>
          </div>
        </div>

        <div className="glass-surface rounded-2xl border border-white/55 bg-white/45 p-3 backdrop-blur-xl">
          <p className="text-sm font-extrabold text-brand-900">Discovery Inbox</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            New/unknown state-DISCOM patterns from bill scans appear here for admin verification.
          </p>
          {discoveryPendingReports.length === 0 ? (
            <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              Inbox clear. No new discovery items are waiting.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {discoveryPendingReports.slice(0, 5).map((item) => (
                <div key={`inbox-${item.id}`} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs font-extrabold text-amber-900">{item.activeTariff || "Unknown DISCOM"}</p>
                  <p className="text-[11px] font-semibold text-amber-800">
                    {item.installerState || "Unknown State"} • {formatSource(item.source)}
                  </p>
                  <p className="text-[11px] font-semibold text-amber-700">
                    {item.reportedAt ? new Date(item.reportedAt).toLocaleString("en-IN") : "Unknown timestamp"}
                  </p>
                </div>
              ))}
              {discoveryPendingReports.length > 5 ? (
                <p className="text-[11px] font-semibold text-slate-600">
                  +{discoveryPendingReports.length - 5} more in queue (use Pending filter to review all).
                </p>
              ) : null}
            </div>
          )}
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {(error as Error).message}
          </div>
        ) : null}

        {isLoading && !data ? (
          <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-6 text-center text-sm font-semibold text-slate-600">
            Loading tariff reports...
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <AnimatePresence>
              {visibleReports.map((report) => {
                const pending = report.status === "pending_admin_approval";
                const key = `${report.table}:${report.id}`;
                const changeTone = compareTone(report.detectedRates, report.databaseRates);
                const glowClass =
                  pending
                    ? "before:absolute before:inset-0 before:rounded-2xl before:bg-amber-300/15 hover:before:bg-amber-300/25 before:transition-colors"
                    : "";
                return (
                  <motion.button
                    type="button"
                    key={key}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -24, scale: 0.96 }}
                    onClick={() => setSelectedReportId(report.id)}
                    className={cn(
                      "glass-surface relative w-full overflow-hidden rounded-2xl border border-white/55 bg-white/55 p-3 text-left backdrop-blur-xl sm:p-4",
                      selectedReport?.id === report.id && "ring-2 ring-brand-300/70",
                      pending && "shadow-[0_0_0_1px_rgba(251,191,36,0.15),0_12px_30px_rgba(245,158,11,0.16)]",
                      glowClass
                    )}
                  >
                    {pending ? (
                      <motion.div
                        className="pointer-events-none absolute inset-0 rounded-2xl bg-amber-300/15"
                        animate={{ opacity: [0.12, 0.26, 0.12] }}
                        transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut" }}
                      />
                    ) : null}
                    <div className="relative z-10">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-extrabold text-brand-900">{report.activeTariff}</p>
                          <p className="text-xs font-semibold text-slate-600">
                            {report.installerState} • {report.installerName} • source: {formatSource(report.source)}
                          </p>
                        </div>
                        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold uppercase", statusToneClass(report.status))}>
                          {statusLabel(report.status)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <DeltaPill label="Detected" rates={report.detectedRates} tone={changeTone} />
                        <DeltaPill label="Database" rates={report.databaseRates} tone="neutral" />
                      </div>

                      {getPrimaryNote(report.note) ? (
                        <p className="mt-2 text-xs font-semibold text-slate-700">
                          <span className="text-slate-500">Note: </span>
                          {getPrimaryNote(report.note)}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-slate-500">
                          Reported: {report.reportedAt ? new Date(report.reportedAt).toLocaleString("en-IN") : "unknown"}
                        </p>
                        {pending ? (
                          <div className="w-full space-y-2 sm:w-auto">
                            <textarea
                              rows={2}
                              value={actionNotes[report.id] ?? ""}
                              onChange={(e) =>
                                setActionNotes((prev) => ({
                                  ...prev,
                                  [report.id]: e.target.value
                                }))
                              }
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Reason (optional but recommended)"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none ring-brand-300/60 transition focus:ring-2 sm:min-w-[280px]"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={approvingId === report.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void reviewReportAction(report, "approve");
                              }}
                              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-400 bg-emerald-50 px-3 text-xs font-extrabold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {approvingId === report.id ? <Skeleton className="mr-2 h-4 w-4 rounded-full" /> : <Sparkles className="mr-2 h-4 w-4" />}
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={approvingId === report.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void reviewReportAction(report, "ignore");
                              }}
                              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-extrabold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Ignore
                            </button>
                            <button
                              type="button"
                              disabled={approvingId === report.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void reviewReportAction(report, "false_positive");
                              }}
                              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-3 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              False Positive
                            </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-slate-500">{statusLabel(report.status)}</p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="glass-surface rounded-2xl border border-white/55 bg-white/55 p-3 backdrop-blur-xl sm:p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Smart Comparison View</p>
            {selectedReport ? <SmartComparisonView report={selectedReport} /> : <p className="mt-2 text-sm font-semibold text-slate-600">Select a report to compare slabs.</p>}
          </div>
        </div>

        {!isLoading && visibleReports.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-6 text-center text-sm font-semibold text-slate-600">
            No tariff reports found for this filter.
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone: "amber" | "emerald" | "indigo" | "slate" }) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "indigo"
          ? "border-indigo-200 bg-indigo-50 text-indigo-900"
          : "border-slate-200 bg-slate-50 text-slate-900";
  return (
    <div className={cn("rounded-xl border px-2.5 py-2", toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-base font-extrabold">{value}</p>
    </div>
  );
}

function isDiscoveryReport(report: AdminTariffReport): boolean {
  const source = (report.source ?? "").toLowerCase();
  const note = (report.note ?? "").toLowerCase();
  return source === "discom_discovery" || note.includes("discovery queue");
}

function statusLabel(status: ReportStatus): string {
  if (status === "pending_admin_approval") return "Pending admin approval";
  if (status === "verified") return "Verified";
  if (status === "ignored") return "Ignored";
  return "False Positive";
}

function statusToneClass(status: ReportStatus): string {
  if (status === "pending_admin_approval") return "bg-amber-100 text-amber-800";
  if (status === "verified") return "bg-emerald-100 text-emerald-800";
  if (status === "ignored") return "bg-slate-200 text-slate-700";
  return "bg-rose-100 text-rose-700";
}

function formatSource(source: string): string {
  if (source === "discom_discovery") return "discovery bot";
  if (source === "ai_scan") return "AI scan";
  if (source === "more_manual") return "manual";
  return source || "unknown";
}

function getPrimaryNote(note: string | null): string {
  if (!note) return "";
  const cleaned = note
    .split("\n")
    .filter((line) => line.trim() && !line.includes("[history]"))
    .join(" ")
    .replace(/\[admin-action:[^\]]+\]\s*/g, "")
    .trim();
  return cleaned;
}

type ParsedHistoryEntry = {
  raw: string;
  timestamp: string;
  action: string;
  actor: string;
  reason: string;
};

function extractHistoryLines(note: string | null): string[] {
  if (!note) return [];
  return note
    .split("\n")
    .filter((line) => line.includes("[history]"))
    .map((line) => line.replace("[history]", "").trim());
}

function parseHistoryLine(line: string): ParsedHistoryEntry {
  const [timestampPart = "", actionPart = "", byPart = "", notePart = ""] = line.split("|").map((p) => p.trim());
  const timestamp = timestampPart;
  const action = actionPart.replace(/^action=/, "").trim() || "unknown";
  const actor = byPart.replace(/^by=/, "").trim() || "admin";
  const reason = notePart.replace(/^note=/, "").trim() || "-";
  return { raw: line, timestamp, action, actor, reason };
}

function actionPillClass(action: string): string {
  if (action === "approve") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (action === "ignore") return "border-slate-300 bg-slate-100 text-slate-700";
  if (action === "false_positive") return "border-rose-300 bg-rose-50 text-rose-700";
  return "border-slate-300 bg-slate-50 text-slate-700";
}

function actionLabel(action: string): string {
  if (action === "approve") return "Approved";
  if (action === "ignore") return "Ignored";
  if (action === "false_positive") return "False Positive";
  return action;
}

function RateList({ label, rates }: { label: string; rates: number[] }) {
  return (
    <div className="rounded-xl border border-white/55 bg-white/70 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-slate-900">
        {rates.length > 0 ? rates.map((r) => `₹${r.toFixed(2)}`).join(" • ") : "Not captured"}
      </p>
    </div>
  );
}

function compareTone(detected: number[], database: number[]): "up" | "down" | "neutral" {
  const d = detected[0] ?? 0;
  const db = database[0] ?? 0;
  if (!d || !db) return "neutral";
  if (d > db) return "up";
  if (d < db) return "down";
  return "neutral";
}

function DeltaPill({ label, rates, tone }: { label: string; rates: number[]; tone: "up" | "down" | "neutral" }) {
  const toneClass =
    tone === "up"
      ? "border-rose-300 bg-rose-50 text-rose-800"
      : tone === "down"
        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
        : "border-slate-300 bg-slate-50 text-slate-700";
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold", toneClass)}>
      {label}: {rates.length ? rates.map((r) => `₹${r.toFixed(2)}`).join(" / ") : "N/A"}
    </span>
  );
}

function buildThirtyDayTrend(rows: AdminTariffReport[]): number[] {
  const map = new Map<string, number>();
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  rows.forEach((r) => {
    if (r.status !== "verified") return;
    const date = new Date(r.updatedAt ?? r.reportedAt ?? "").toISOString().slice(0, 10);
    if (!map.has(date)) return;
    map.set(date, (map.get(date) ?? 0) + 1);
  });
  return [...map.values()];
}

function TrendLine({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const points = data
    .map((v, idx) => {
      const x = (idx / Math.max(1, data.length - 1)) * 100;
      const y = 100 - (v / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" className="h-20 w-full">
      <polyline fill="none" stroke="rgb(16 185 129)" strokeWidth="2.5" points={points} />
    </svg>
  );
}

function SmartComparisonView({ report }: { report: AdminTariffReport }) {
  const detected = report.detectedRates.length ? report.detectedRates : [0];
  const database = report.databaseRates.length ? report.databaseRates : [0];
  const all = [...detected, ...database];
  const max = Math.max(1, ...all);
  const history = extractHistoryLines(report.note).map(parseHistoryLine).reverse();
  return (
    <div className="mt-2 space-y-3">
      <p className="text-sm font-extrabold text-brand-900">{report.activeTariff}</p>
      <div className="grid grid-cols-2 gap-2">
        <RateList label="Detected (AI)" rates={detected} />
        <RateList label="Database" rates={database} />
      </div>
      <div className="rounded-xl border border-white/70 bg-white/70 p-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Slab graph</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-[11px] font-bold text-rose-700">New (AI)</p>
            <div className="flex h-28 items-end gap-1">
              {detected.map((r, i) => (
                <div key={`d-${i}`} className="flex-1 rounded-t bg-rose-400/85" style={{ height: `${Math.max(6, (r / max) * 100)}%` }} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold text-emerald-700">Current DB</p>
            <div className="flex h-28 items-end gap-1">
              {database.map((r, i) => (
                <div key={`b-${i}`} className="flex-1 rounded-t bg-emerald-400/85" style={{ height: `${Math.max(6, (r / max) * 100)}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-white/70 bg-white/70 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Action History</p>
        {history.length ? (
          <div className="mt-2 space-y-2">
            {history.map((entry, idx) => (
              <div key={`${report.id}-h-${idx}-${entry.raw}`} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", actionPillClass(entry.action))}>
                    {actionLabel(entry.action)}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString("en-IN") : "Unknown time"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-slate-700">By: {entry.actor}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-700">Reason: {entry.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs font-semibold text-slate-600">No review actions yet.</p>
        )}
      </div>
    </div>
  );
}
