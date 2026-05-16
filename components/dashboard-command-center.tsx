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
  UserPlus
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

function useAnimatedInt(target: number, enabled: boolean, durationMs = 680) {
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
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });

  const operationalHeadline = (() => {
    if (!stats) {
      return uiLang === "hi" ? "ऑपरेशनल स्थिति लोड हो रही है" : "Loading operational status";
    }
    if (stats.pendingPayments > 0) {
      return uiLang === "hi"
        ? `${formatInr(stats.pendingPayments)} बकाया — आज संग्रह प्राथमिक`
        : `${formatInr(stats.pendingPayments)} outstanding — collections are today's priority`;
    }
    if (stats.proposalsSent > 0 && stats.orders < stats.proposalsSent) {
      return uiLang === "hi"
        ? `${stats.proposalsSent} प्रस्ताव सक्रिय — कन्वर्ज़न पर ध्यान दें`
        : `${stats.proposalsSent} proposals active — drive conversion to orders`;
    }
    if (stats.totalLeads > 0) {
      return uiLang === "hi"
        ? `पाइपलाइन में ${stats.totalLeads} लीड्स — गति बनाए रखें`
        : `${stats.totalLeads} leads in pipeline — maintain forward momentum`;
    }
    return uiLang === "hi" ? "सिस्टम तैयार — पहली लीड जोड़ें" : "System ready — add your first lead to begin";
  })();

  const directive = (() => {
    if (!stats) {
      return uiLang === "hi"
        ? "डेटा सिंक होते ही आज का निर्देश यहाँ दिखेगा।"
        : "Today's directive will appear once data syncs.";
    }
    if (stats.pendingPayments > 0) {
      return uiLang === "hi"
        ? "बकाया खातों पर कॉल करें, भुगतान लिंक भेजें, और प्रोजेक्ट स्टेटस अपडेट करें।"
        : "Call outstanding accounts, send payment links, and update project status before EOD.";
    }
    if (stats.proposalsSent > 0) {
      return uiLang === "hi"
        ? "जिन ग्राहकों ने प्रस्ताव लिंक नहीं खोला, उन्हें आज फॉलो-अप करें।"
        : "Follow up today with customers who have not opened the proposal link.";
    }
    return uiLang === "hi"
      ? "नई लीड कैप्चर करें और प्रस्ताव बनाकर पाइपलाइन आगे बढ़ाएँ।"
      : "Capture new leads and advance the pipeline with fresh proposals.";
  })();

  const urgentFollowUps = insights?.followUps.filter((f) => f.stale).slice(0, 2) ?? [];

  const pipeline = [
    {
      key: "leads",
      tone: "sky" as const,
      label: uiLang === "hi" ? "लीड्स" : "Leads",
      raw: stats?.totalLeads ?? 0,
      format: (n: number) => String(n),
      icon: UserPlus,
      href: "/customers"
    },
    {
      key: "proposals",
      tone: "emerald" as const,
      label: uiLang === "hi" ? "प्रस्ताव" : "Proposals",
      raw: stats?.proposalsSent ?? 0,
      format: (n: number) => String(n),
      icon: Send,
      href: "/proposals"
    },
    {
      key: "orders",
      tone: "amber" as const,
      label: uiLang === "hi" ? "ऑर्डर" : "Orders",
      raw: stats?.orders ?? 0,
      format: (n: number) => String(n),
      icon: ClipboardList,
      href: "/projects"
    },
    {
      key: "kw",
      tone: "teal" as const,
      label: uiLang === "hi" ? "इंस्टॉल kW" : "Installed",
      raw: Math.round(stats?.installedKw ?? 0),
      format: (n: number) => n.toLocaleString("en-IN"),
      icon: Sun,
      href: "/projects"
    }
  ];

  const animate = Boolean(stats) && !loading;
  const anim = {
    leads: useAnimatedInt(stats?.totalLeads ?? 0, animate),
    proposals: useAnimatedInt(stats?.proposalsSent ?? 0, animate),
    orders: useAnimatedInt(stats?.orders ?? 0, animate),
    kw: useAnimatedInt(Math.round(stats?.installedKw ?? 0), animate)
  };

  const isLive = Boolean(stats) && !loading;

  return (
    <header className={cn("glass-command-center isolate ws-command-enter", className)}>
      <div className="glass-command-rim pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden />
      <div className="glass-command-ambient pointer-events-none absolute inset-0" aria-hidden />
      <div className="glass-hero-bloom pointer-events-none absolute inset-0 opacity-90" aria-hidden />
      <div className="glass-command-sheen pointer-events-none absolute inset-0" aria-hidden />
      <div className="glass-command-reflect pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden />
      <div className="glass-hero-noise pointer-events-none absolute inset-0 opacity-[0.2]" aria-hidden />

      <div className="relative flex flex-col gap-5 p-5 sm:gap-6 sm:p-6 md:p-7">
        {/* Status rail — not a marketing hero */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/50 pb-4 dark:border-white/10">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="ws-type-eyebrow text-slate-500 dark:text-[#8B949E]">
              {uiLang === "hi" ? "वर्कस्पेस" : "Workspace"}
            </span>
            <span className="hidden h-3 w-px bg-slate-300/80 sm:block dark:bg-white/15" aria-hidden />
            <span className="text-xs font-medium text-slate-500 dark:text-[#8B949E]">
              {t("dashboard_greetingName", { name })} · {dateStr}
            </span>
            {isLive ? (
              <span className="ws-live-pill inline-flex items-center gap-1.5">
                <span className="ws-live-dot" aria-hidden />
                {uiLang === "hi" ? "लाइव" : "Live"}
              </span>
            ) : loading ? (
              <span className="ws-live-pill ws-live-pill--muted">{uiLang === "hi" ? "सिंक" : "Sync"}</span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/customers?add=1"
              className="glass-hero-cta-secondary hidden rounded-lg px-3 py-2 text-xs font-semibold sm:inline-flex"
            >
              {t("dashboard_addCustomerCta")}
            </Link>
            <Link href="/proposal" className="glass-hero-cta group inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white">
              {t("actions_newProposal")}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Operational headline — primary focus */}
        <div className="glass-status-focus space-y-2">
          <p className="ws-type-label">{uiLang === "hi" ? "ऑपरेशनल स्थिति" : "Operational status"}</p>
          {loading && !stats ? (
            <Skeleton className="h-9 w-full max-w-lg rounded-lg" />
          ) : (
            <p className="ws-type-status-headline border-l-0 pl-0">{operationalHeadline}</p>
          )}
        </div>

        {/* Pipeline console — single control strip, not four KPI cards */}
        <nav className="glass-pipeline-console" aria-label={uiLang === "hi" ? "पाइपलाइन कंसोल" : "Pipeline console"}>
          {pipeline.map((seg, i) => {
            const Icon = seg.icon;
            const val = loading && !stats ? "—" : seg.format(anim[seg.key as keyof typeof anim] ?? seg.raw);
            const segment = (
              <Link
                href={seg.href}
                className={cn("glass-pipeline-segment group", i > 0 && "glass-pipeline-segment--divider")}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" strokeWidth={2.25} aria-hidden />
                <span className="min-w-0">
                  <span className="glass-pipeline-segment-value tabular-nums">{val}</span>
                  <span className="glass-pipeline-segment-label">{seg.label}</span>
                </span>
              </Link>
            );
            if (reduced) return <div key={seg.key}>{segment}</div>;
            return (
              <motion.div
                key={seg.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.04 * i }}
              >
                {segment}
              </motion.div>
            );
          })}
        </nav>

        {/* Intelligence panels */}
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
          <div className="glass-command-inset space-y-2.5 lg:col-span-7">
            <p className="ws-type-label">{uiLang === "hi" ? "आज का निर्देश" : "Today's directive"}</p>
            <p className="ws-type-body">{directive}</p>
            {urgentFollowUps.length > 0 ? (
              <ul className="mt-2 space-y-1 border-t border-white/40 pt-2.5 dark:border-white/10">
                {urgentFollowUps.map((row) => (
                  <li key={row.id}>
                    <Link href={row.href} className="glass-urgent-row group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2">
                      <span className="min-w-0 truncate text-xs font-semibold text-slate-800 dark:text-white">{row.name}</span>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        {uiLang === "hi" ? "रुका" : "Stale"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="glass-command-inset lg:col-span-5">
            <p className="ws-type-label mb-2.5">{uiLang === "hi" ? "वित्तीय पल्स" : "Financial pulse"}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="glass-pulse-stat glass-pulse-stat--revenue">
                <span className="ws-icon-well ws-icon-well--emerald mb-2" aria-hidden>
                  <CircleDollarSign className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{t("metrics_revenue")}</p>
                {loading && !stats ? (
                  <Skeleton className="mt-1.5 h-6 w-20 rounded" />
                ) : (
                  <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-emerald-900 dark:text-emerald-100">
                    {stats ? formatInr(stats.revenue) : "—"}
                  </p>
                )}
              </div>
              <div className={cn("glass-pulse-stat", stats && stats.pendingPayments > 0 && "glass-pulse-stat--alert")}>
                <span className={cn("ws-icon-well mb-2", stats && stats.pendingPayments > 0 ? "ws-icon-well--rose" : "ws-icon-well--indigo")} aria-hidden>
                  <CircleDollarSign className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{t("metrics_pending")}</p>
                {loading && !stats ? (
                  <Skeleton className="mt-1.5 h-6 w-20 rounded" />
                ) : (
                  <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-brand-950 dark:text-white">
                    {stats ? formatInr(stats.pendingPayments) : "—"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
