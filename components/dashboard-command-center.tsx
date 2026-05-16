"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStatsPayload } from "@/lib/dashboard-stats-client";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ClipboardList, Send, Sun, UserPlus } from "lucide-react";
import Link from "next/link";

type DashboardCommandCenterProps = {
  name?: string;
  stats?: DashboardStatsPayload | null;
  loading?: boolean;
  className?: string;
};

function formatInr(n: number): string {
  return `₹${Math.round(Math.max(0, n)).toLocaleString("en-IN")}`;
}

export function DashboardCommandCenter({ name = "Avanish", stats, loading, className }: DashboardCommandCenterProps) {
  const { t, locale } = useLanguage();
  const reduced = useReducedMotion();
  const uiLang = locale === "en" ? "en" : "hi";

  const now = new Date();
  const weekday = now.toLocaleDateString("en-IN", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const focus = (() => {
    if (!stats) {
      return uiLang === "hi" ? "डेटा लोड होने पर आज का फोकस यहाँ दिखेगा।" : "Today's focus will appear when your numbers load.";
    }
    if (stats.pendingPayments > 0) {
      return uiLang === "hi"
        ? `${formatInr(stats.pendingPayments)} बकाया — आज कलेक्शन / फॉलो-अप करें।`
        : `${formatInr(stats.pendingPayments)} pending — prioritize collections and follow-ups today.`;
    }
    if (stats.proposalsSent > 0) {
      return uiLang === "hi"
        ? `${stats.proposalsSent} प्रस्ताव भेजे गए — जिन्होंने लिंक नहीं खोला, उन्हें कॉल करें।`
        : `${stats.proposalsSent} proposals out — call customers who have not opened the link yet.`;
    }
    if (stats.totalLeads > 0) {
      return uiLang === "hi"
        ? `${stats.totalLeads} लीड्स — नए प्रस्ताव बनाकर पाइपलाइन आगे बढ़ाएँ।`
        : `${stats.totalLeads} leads in pipeline — create proposals to move deals forward.`;
    }
    return uiLang === "hi" ? "नई लीड जोड़ें या पहला प्रस्ताव बनाएँ।" : "Add a lead or create your first proposal to get started.";
  })();

  const tiles = [
    { key: "leads", label: uiLang === "hi" ? "लीड्स" : "Leads", value: stats ? String(stats.totalLeads) : "—", icon: UserPlus, href: "/customers", tone: "sky" as const },
    { key: "proposals", label: uiLang === "hi" ? "प्रस्ताव" : "Proposals", value: stats ? String(stats.proposalsSent) : "—", icon: Send, href: "/proposals", tone: "emerald" as const },
    { key: "orders", label: uiLang === "hi" ? "ऑर्डर" : "Orders", value: stats ? String(stats.orders) : "—", icon: ClipboardList, href: "/projects", tone: "amber" as const },
    { key: "kw", label: uiLang === "hi" ? "इंस्टॉल" : "Installed", value: stats ? `${stats.installedKw.toLocaleString("en-IN")} kW` : "—", icon: Sun, href: "/projects", tone: "teal" as const }
  ];

  return (
    <header className={cn("glass-hero relative overflow-hidden rounded-[1.35rem]", className)}>
      <div className="glass-hero-bloom pointer-events-none absolute inset-0" aria-hidden />
      <div className="glass-hero-noise pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />

      <div className="relative flex flex-col gap-5 p-4 sm:gap-6 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-700/80">
              {uiLang === "hi" ? "कमांड सेंटर" : "Command center"}
            </p>
            <h1 className="mt-2 font-sans text-[1.65rem] font-semibold leading-[1.15] tracking-tight text-brand-950 dark:text-white sm:text-[1.85rem]">
              {t("dashboard_greetingName", { name })}
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-600 dark:text-[#8B949E]">
              {weekday}, {dateStr}
            </p>
          </div>

          <Link
            href="/proposal"
            className="glass-hero-cta group inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 motion-reduce:transform-none"
          >
            {t("actions_newProposal")}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {uiLang === "hi" ? "आज का फोकस" : "Today's focus"}
          </p>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-700 dark:text-[#C9D1D9]">{focus}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {tiles.map((tile, i) => {
            const Icon = tile.icon;
            const chip = (
              <Link
                href={tile.href}
                className={cn(
                  "glass-metric-chip group flex flex-col gap-2 rounded-xl p-3 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 motion-reduce:transform-none sm:p-3.5",
                  tile.tone === "sky" && "glass-metric-chip--sky",
                  tile.tone === "emerald" && "glass-metric-chip--emerald",
                  tile.tone === "amber" && "glass-metric-chip--amber",
                  tile.tone === "teal" && "glass-metric-chip--teal"
                )}
              >
                <span className="glass-metric-chip-icon flex h-8 w-8 items-center justify-center rounded-lg">
                  <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </span>
                {loading && !stats ? (
                  <Skeleton className="h-7 w-16 rounded-md bg-slate-200/80" />
                ) : (
                  <p className="text-xl font-bold tabular-nums tracking-tight text-brand-900 sm:text-2xl">{tile.value}</p>
                )}
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{tile.label}</p>
              </Link>
            );
            if (reduced) return <div key={tile.key}>{chip}</div>;
            return (
              <motion.div
                key={tile.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 + i * 0.05 }}
              >
                {chip}
              </motion.div>
            );
          })}
        </div>

        {stats && stats.pendingPayments > 0 ? (
          <div className="glass-hero-banner flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 sm:px-4">
            <p className="text-xs font-medium text-slate-700 sm:text-sm">
              <span className="font-semibold text-brand-900">{formatInr(stats.pendingPayments)}</span>
              {uiLang === "hi" ? " बकाया" : " outstanding"}
            </p>
            <Link href="/projects" className="text-xs font-bold text-brand-700 hover:text-brand-900">
              {uiLang === "hi" ? "प्रोजेक्ट →" : "Projects →"}
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
