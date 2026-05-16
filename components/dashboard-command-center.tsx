"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStatsPayload } from "@/lib/dashboard-stats-client";
import { buildOperationalInsights } from "@/lib/dashboard-operational-insights";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CircleDollarSign,
  ClipboardList,
  Send,
  Sun,
  UserPlus,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardCommandCenterProps = {
  name?: string;
  stats?: DashboardStatsPayload | null;
  loading?: boolean;
  className?: string;
};

function formatInr(n: number): string {
  return `₹${Math.round(Math.max(0, n)).toLocaleString("en-IN")}`;
}

function useAnimatedInt(target: number, enabled: boolean, durationMs = 720) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled || !Number.isFinite(target)) {
      setValue(target);
      return;
    }
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    setValue(0);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, durationMs]);
  return value;
}

export function DashboardCommandCenter({ name = "Avanish", stats, loading, className }: DashboardCommandCenterProps) {
  const { t, locale } = useLanguage();
  const reduced = useReducedMotion();
  const uiLang = locale === "en" ? "en" : "hi";
  const insights = useMemo(() => buildOperationalInsights(stats, null, uiLang), [stats, uiLang]);

  const now = new Date();
  const weekday = now.toLocaleDateString("en-IN", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const focus = (() => {
    if (!stats) {
      return uiLang === "hi" ? "डेटा लोड होने पर आज का फोकस यहाँ दिखेगा।" : "Today's focus will appear when your numbers load.";
    }
    if (stats.pendingPayments > 0) {
      return uiLang === "hi"
        ? `${formatInr(stats.pendingPayments)} बकाया — आज कलेक्शन और फॉलो-अप प्राथमिकता पर।`
        : `${formatInr(stats.pendingPayments)} outstanding — prioritize collections and follow-ups today.`;
    }
    if (stats.proposalsSent > 0) {
      return uiLang === "hi"
        ? `${stats.proposalsSent} प्रस्ताव सक्रिय — जिन्होंने लिंक नहीं खोला, उन्हें आज कॉल करें।`
        : `${stats.proposalsSent} proposals active — call customers who have not opened the link yet.`;
    }
    if (stats.totalLeads > 0) {
      return uiLang === "hi"
        ? `${stats.totalLeads} लीड्स पाइपलाइन में — नए प्रस्ताव से गति बनाएँ।`
        : `${stats.totalLeads} leads in pipeline — create proposals to keep momentum.`;
    }
    return uiLang === "hi" ? "नई लीड जोड़ें या पहला प्रस्ताव बनाएँ।" : "Add a lead or create your first proposal to get started.";
  })();

  const urgentFollowUps = insights?.followUps.filter((f) => f.stale).slice(0, 2) ?? [];

  const tiles = [
    {
      key: "leads",
      label: uiLang === "hi" ? "लीड्स" : "Leads",
      raw: stats?.totalLeads ?? 0,
      format: (n: number) => String(n),
      icon: UserPlus,
      href: "/customers",
      tone: "sky" as const
    },
    {
      key: "proposals",
      label: uiLang === "hi" ? "प्रस्ताव" : "Proposals",
      raw: stats?.proposalsSent ?? 0,
      format: (n: number) => String(n),
      icon: Send,
      href: "/proposals",
      tone: "emerald" as const
    },
    {
      key: "orders",
      label: uiLang === "hi" ? "ऑर्डर" : "Orders",
      raw: stats?.orders ?? 0,
      format: (n: number) => String(n),
      icon: ClipboardList,
      href: "/projects",
      tone: "amber" as const
    },
    {
      key: "kw",
      label: uiLang === "hi" ? "इंस्टॉल" : "Installed",
      raw: stats?.installedKw ?? 0,
      format: (n: number) => `${n.toLocaleString("en-IN")} kW`,
      icon: Sun,
      href: "/projects",
      tone: "teal" as const
    }
  ];

  const animateMetrics = Boolean(stats) && !loading;
  const leadsAnim = useAnimatedInt(stats?.totalLeads ?? 0, animateMetrics);
  const proposalsAnim = useAnimatedInt(stats?.proposalsSent ?? 0, animateMetrics);
  const ordersAnim = useAnimatedInt(stats?.orders ?? 0, animateMetrics);
  const kwAnim = useAnimatedInt(Math.round(stats?.installedKw ?? 0), animateMetrics);
  const animatedValues: Record<string, number> = {
    leads: leadsAnim,
    proposals: proposalsAnim,
    orders: ordersAnim,
    kw: kwAnim
  };

  const isLive = Boolean(stats) && !loading;

  return (
    <header className={cn("glass-command-center relative overflow-hidden rounded-[1.4rem]", className)}>
      <div className="glass-command-rim pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden />
      <div className="glass-hero-bloom pointer-events-none absolute inset-0" aria-hidden />
      <div className="glass-command-sheen pointer-events-none absolute inset-0" aria-hidden />
      <div className="glass-hero-noise pointer-events-none absolute inset-0 opacity-[0.28]" aria-hidden />

      <div className="relative flex flex-col gap-6 p-5 sm:gap-7 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="ws-type-eyebrow text-brand-700/85 dark:text-teal-300/90">
                {uiLang === "hi" ? "कमांड सेंटर" : "Command center"}
              </span>
              {isLive ? (
                <span className="ws-live-pill inline-flex items-center gap-1.5">
                  <span className="ws-live-dot" aria-hidden />
                  {uiLang === "hi" ? "लाइव" : "Live"}
                </span>
              ) : loading ? (
                <span className="ws-live-pill ws-live-pill--muted">{uiLang === "hi" ? "सिंक…" : "Syncing…"}</span>
              ) : null}
            </div>
            <h1 className="ws-type-hero text-brand-950 dark:text-white">{t("dashboard_greetingName", { name })}</h1>
            <p className="ws-type-subline">
              {weekday} · {dateStr}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
            <Link href="/proposal" className="glass-hero-cta group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white">
              <Zap className="h-4 w-4 opacity-90" strokeWidth={2.25} aria-hidden />
              {t("actions_newProposal")}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href="/customers?add=1"
              className="glass-hero-cta-secondary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              {t("dashboard_addCustomerCta")}
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="glass-command-inset space-y-3 lg:col-span-7">
            <p className="ws-type-label">{uiLang === "hi" ? "आज का ऑपरेशनल फोकस" : "Today's operational focus"}</p>
            <p className="ws-type-body max-w-2xl">{focus}</p>
            {urgentFollowUps.length > 0 ? (
              <div className="flex flex-col gap-2 pt-1">
                <p className="ws-type-label text-amber-800/90 dark:text-amber-200/90">
                  {uiLang === "hi" ? "तत्काल फॉलो-अप" : "Urgent follow-ups"}
                </p>
                <ul className="space-y-1.5">
                  {urgentFollowUps.map((row) => (
                    <li key={row.id}>
                      <Link href={row.href} className="glass-urgent-row group flex items-center justify-between gap-2 rounded-lg px-3 py-2">
                        <span className="min-w-0 truncate text-xs font-semibold text-slate-800 dark:text-white">{row.name}</span>
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-700 group-hover:text-amber-900 dark:text-amber-300">
                          {uiLang === "hi" ? "देखें" : "Review"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="glass-command-inset lg:col-span-5">
            <p className="ws-type-label mb-3">{uiLang === "hi" ? "बिज़नेस पल्स" : "Business pulse"}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-pulse-stat">
                <CircleDollarSign className="mb-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} aria-hidden />
                <p className="ws-type-label">{t("metrics_revenue")}</p>
                {loading && !stats ? (
                  <Skeleton className="mt-2 h-7 w-24 rounded-md" />
                ) : (
                  <p className="ws-type-metric mt-1 text-emerald-900 dark:text-emerald-100">
                    {stats ? formatInr(stats.revenue) : "—"}
                  </p>
                )}
              </div>
              <div className={cn("glass-pulse-stat", stats && stats.pendingPayments > 0 && "glass-pulse-stat--alert")}>
                <CircleDollarSign className="mb-2 h-4 w-4 text-rose-600 dark:text-rose-400" strokeWidth={2.25} aria-hidden />
                <p className="ws-type-label">{t("metrics_pending")}</p>
                {loading && !stats ? (
                  <Skeleton className="mt-2 h-7 w-24 rounded-md" />
                ) : (
                  <p className="ws-type-metric mt-1">{stats ? formatInr(stats.pendingPayments) : "—"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="ws-type-label mb-3">{uiLang === "hi" ? "ऑपरेशनल इंडिकेटर्स" : "Operational indicators"}</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {tiles.map((tile, i) => {
              const Icon = tile.icon;
              const display = loading && !stats ? "—" : tile.format(animatedValues[tile.key] ?? tile.raw);
              const chip = (
                <Link
                  href={tile.href}
                  className={cn(
                    "glass-metric-chip-premium group flex flex-col gap-2.5 rounded-[1rem] p-3.5 sm:p-4",
                    tile.tone === "sky" && "glass-metric-chip--sky",
                    tile.tone === "emerald" && "glass-metric-chip--emerald",
                    tile.tone === "amber" && "glass-metric-chip--amber",
                    tile.tone === "teal" && "glass-metric-chip--teal"
                  )}
                >
                  <span className="glass-metric-chip-icon flex h-9 w-9 items-center justify-center rounded-[0.65rem]">
                    <Icon className="h-[1.05rem] w-[1.05rem]" strokeWidth={2.25} aria-hidden />
                  </span>
                  {loading && !stats ? (
                    <Skeleton className="h-8 w-[4.5rem] rounded-lg bg-slate-200/80" />
                  ) : (
                    <p className="ws-type-metric-lg tabular-nums text-brand-950 dark:text-white">{display}</p>
                  )}
                  <p className="ws-type-chip-label">{tile.label}</p>
                </Link>
              );
              if (reduced) return <div key={tile.key}>{chip}</div>;
              return (
                <motion.div
                  key={tile.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.06 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                >
                  {chip}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
