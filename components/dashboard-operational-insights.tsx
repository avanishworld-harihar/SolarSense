"use client";

import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStatsPayload } from "@/lib/dashboard-stats-client";
import { buildOperationalInsights } from "@/lib/dashboard-operational-insights";
import type { MetricTrendLines } from "@/lib/dashboard-trends";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ClipboardCheck,
  Clock,
  HardHat,
  Lightbulb,
  Percent,
  Wallet
} from "lucide-react";
import Link from "next/link";

type DashboardOperationalInsightsProps = {
  stats?: DashboardStatsPayload | null;
  trends?: MetricTrendLines | null;
  loading?: boolean;
  className?: string;
};

const alertTone: Record<string, string> = {
  amber: "border-amber-200/80 bg-amber-50/50 dark:border-amber-500/25 dark:bg-amber-950/20",
  rose: "border-rose-200/80 bg-rose-50/45 dark:border-rose-500/25 dark:bg-rose-950/20",
  sky: "border-sky-200/80 bg-sky-50/45 dark:border-sky-500/25 dark:bg-sky-950/20",
  emerald: "border-emerald-200/80 bg-emerald-50/45 dark:border-emerald-500/25 dark:bg-emerald-950/20"
};

const overdueTone: Record<string, string> = {
  amber: "border-amber-200/85 bg-amber-50/55 dark:border-amber-500/30 dark:bg-amber-950/25",
  rose: "border-rose-200/85 bg-rose-50/50 dark:border-rose-500/30 dark:bg-rose-950/25",
  sky: "border-sky-200/85 bg-sky-50/50 dark:border-sky-500/30 dark:bg-sky-950/25"
};

type IconTone = "sky" | "emerald" | "amber" | "teal" | "violet" | "rose" | "indigo" | "warning";

function InsightPanel({
  title,
  icon: Icon,
  iconTone = "sky",
  children,
  className
}: {
  title: string;
  icon: typeof Activity;
  iconTone?: IconTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("glass-panel-premium flex flex-col p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className={cn("ws-icon-well", `ws-icon-well--${iconTone}`)} aria-hidden>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-[#8B949E]">{title}</h3>
      </div>
      {children}
    </article>
  );
}

function trendRowClass(line: string | null, kind: "revenue" | "pending"): string {
  if (!line) return "ws-intel-trend-row";
  const lower = line.toLowerCase();
  if (kind === "pending") {
    if (lower.includes("up") || lower.includes("बढ़ा") || lower.includes("அதிகரித்த")) return "ws-intel-trend-row ws-intel-trend-row--warn";
    if (lower.includes("down") || lower.includes("घटा") || lower.includes("குறைந்த")) return "ws-intel-trend-row ws-intel-trend-row--up";
  } else {
    if (lower.includes("more") || lower.includes("ज़्यादा") || lower.includes("அதிகம்")) return "ws-intel-trend-row ws-intel-trend-row--up";
    if (lower.includes("less") || lower.includes("कम") || lower.includes("குறை")) return "ws-intel-trend-row ws-intel-trend-row--down";
  }
  return "ws-intel-trend-row";
}

export function DashboardOperationalInsights({ stats, trends, loading, className }: DashboardOperationalInsightsProps) {
  const { locale } = useLanguage();
  const uiLang = locale === "en" ? "en" : "hi";
  const model = buildOperationalInsights(stats, trends ?? null, uiLang);

  if (loading && !stats) {
    return (
      <div className={cn("grid gap-4 sm:gap-5 lg:grid-cols-2", className)}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="ws-shimmer h-44 rounded-[1.2rem] border border-white/40" />
        ))}
      </div>
    );
  }

  if (!model) return null;

  return (
    <div className={cn("grid gap-4 sm:gap-5", className)}>
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <InsightPanel
          title={uiLang === "hi" ? "कन्वर्ज़न फनल" : "Conversion funnel"}
          icon={Percent}
          iconTone="emerald"
          className="lg:col-span-7"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="ws-conversion-metric">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {uiLang === "hi" ? "लीड → प्रस्ताव" : "Lead → proposal"}
              </p>
              <p className="ws-conversion-metric-value text-sky-900 dark:text-sky-100">
                {model.conversion.leadToProposalPct != null ? `${model.conversion.leadToProposalPct}%` : "—"}
              </p>
              <div className="ws-conversion-bar">
                <div
                  className="ws-conversion-bar-fill ws-conversion-bar-fill--sky"
                  style={{ width: `${model.conversion.leadToProposalPct ?? 0}%` }}
                />
              </div>
            </div>
            <div className="ws-conversion-metric">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {uiLang === "hi" ? "प्रस्ताव → ऑर्डर" : "Proposal → order"}
              </p>
              <p className="ws-conversion-metric-value text-emerald-900 dark:text-emerald-100">
                {model.conversion.proposalToOrderPct != null ? `${model.conversion.proposalToOrderPct}%` : "—"}
              </p>
              <div className="ws-conversion-bar">
                <div
                  className="ws-conversion-bar-fill ws-conversion-bar-fill--emerald"
                  style={{ width: `${model.conversion.proposalToOrderPct ?? 0}%` }}
                />
              </div>
            </div>
          </div>
          <p
            className={cn(
              "mt-3 text-sm leading-relaxed",
              model.conversion.tone === "good" && "text-emerald-800 dark:text-emerald-300",
              model.conversion.tone === "warn" && "text-amber-900 dark:text-amber-200",
              model.conversion.tone === "neutral" && "text-slate-600 dark:text-[#8B949E]"
            )}
          >
            {model.conversion.summary}
          </p>
          <p className="mt-2 text-[10px] font-medium text-slate-400 dark:text-[#6E7681]">
            {uiLang === "hi" ? "गिनती कमांड सेंटर में — यहाँ केवल दरें।" : "Counts live in Command Center — rates only here."}
          </p>
        </InsightPanel>

        <InsightPanel
          title={uiLang === "hi" ? "ऑपरेशन अलर्ट" : "Operational alerts"}
          icon={AlertTriangle}
          iconTone="warning"
          className="lg:col-span-5"
        >
          <ul className="space-y-2.5">
            {model.alerts.map((alert) => (
              <li
                key={alert.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5 transition-colors",
                  alertTone[alert.tone] ?? alertTone.sky
                )}
              >
                <p className="text-xs font-bold text-slate-800 dark:text-white">{alert.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-[#8B949E]">{alert.body}</p>
                {alert.href && alert.cta ? (
                  <Link
                    href={alert.href}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-900 dark:text-teal-300"
                  >
                    {alert.cta}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </InsightPanel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
        <InsightPanel
          title={uiLang === "hi" ? "फॉलो-अप" : "Follow-ups"}
          icon={ClipboardCheck}
          iconTone="sky"
          className="lg:col-span-6"
        >
          {model.followUps.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-[#8B949E]">
              {uiLang === "hi" ? "कोई लंबित फॉलो-अप नहीं।" : "No pending follow-ups on active projects."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-200/70 dark:divide-white/10">
              {model.followUps.map((row) => (
                <li key={row.id}>
                  <Link
                    href={row.href}
                    className="group flex items-start justify-between gap-2 py-2.5 transition-colors hover:text-brand-800"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{row.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-[#8B949E]">{row.subtitle}</p>
                    </div>
                    {row.stale ? (
                      <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                        {uiLang === "hi" ? "रुका" : "Stale"}
                      </span>
                    ) : (
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </InsightPanel>

        <InsightPanel
          title={uiLang === "hi" ? "इंस्टॉलेशन प्रगति" : "Installation progress"}
          icon={HardHat}
          iconTone="amber"
          className="lg:col-span-6"
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              {
                label: uiLang === "hi" ? "सक्रिय" : "Active",
                n: model.install.active,
                tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
              },
              {
                label: uiLang === "hi" ? "लंबित" : "Pending",
                n: model.install.pending,
                tone: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
              },
              {
                label: uiLang === "hi" ? "पूर्ण" : "Done",
                n: model.install.done,
                tone: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-[#C9D1D9]"
              }
            ].map((chip) => (
              <span key={chip.label} className={cn("rounded-lg px-2.5 py-1 text-[11px] font-bold tabular-nums", chip.tone)}>
                {chip.label} · {chip.n}
              </span>
            ))}
          </div>
          <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
              style={{ width: `${model.install.avgProgress}%` }}
            />
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-[#8B949E]">{model.install.summary}</p>
        </InsightPanel>
      </div>

      {/* Intelligence row — no duplicate ₹ metrics */}
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <InsightPanel
          title={uiLang === "hi" ? "संग्रह ट्रेंड" : "Collection trend"}
          icon={Wallet}
          iconTone="teal"
          className="lg:col-span-4"
        >
          <div className="space-y-2">
            <div className={trendRowClass(model.collectionTrend.revenueTrend, "revenue")}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                {uiLang === "hi" ? "राजस्व ट्रेंड" : "Revenue trend"}
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug text-slate-800 dark:text-white">
                {model.collectionTrend.revenueTrend ??
                  (uiLang === "hi" ? "अगली सिंक के बाद" : "After next sync")}
              </p>
            </div>
            <div className={trendRowClass(model.collectionTrend.pendingTrend, "pending")}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                {uiLang === "hi" ? "लंबित ट्रेंड" : "Outstanding trend"}
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug text-slate-800 dark:text-white">
                {model.collectionTrend.pendingTrend ??
                  (uiLang === "hi" ? "अगली सिंक के बाद" : "After next sync")}
              </p>
            </div>
          </div>
          <p
            className={cn(
              "mt-3 text-sm leading-relaxed",
              model.collectionTrend.tone === "warn" && "text-amber-900 dark:text-amber-200",
              model.collectionTrend.tone === "good" && "text-emerald-800 dark:text-emerald-300",
              model.collectionTrend.tone === "neutral" && "text-slate-600 dark:text-[#8B949E]"
            )}
          >
            {model.collectionTrend.insight}
          </p>
        </InsightPanel>

        <InsightPanel
          title={uiLang === "hi" ? "ओवरड्यू और ध्यान" : "Overdue & attention"}
          icon={Clock}
          iconTone="rose"
          className="lg:col-span-4"
        >
          <p className="mb-2.5 text-xs font-semibold text-slate-500 dark:text-[#8B949E]">{model.overdue.summary}</p>
          {model.overdue.items.length === 0 ? (
            <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/20 dark:text-emerald-200">
              {uiLang === "hi" ? "सब कुछ समय पर — अच्छा काम।" : "Everything on track — nice work."}
            </p>
          ) : (
            <ul className="space-y-2">
              {model.overdue.items.map((item) => (
                <li
                  key={item.id}
                  className={cn("rounded-xl border px-3 py-2.5", overdueTone[item.tone] ?? overdueTone.amber)}
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{item.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-[#8B949E]">{item.body}</p>
                  {item.href && item.cta ? (
                    <Link
                      href={item.href}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 dark:text-teal-300"
                    >
                      {item.cta}
                      <ArrowRight className="h-3 w-3" aria-hidden />
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </InsightPanel>

        <InsightPanel
          title={uiLang === "hi" ? "हाल की गतिविधि" : "Recent activity"}
          icon={Activity}
          iconTone="violet"
          className="lg:col-span-4"
        >
          {model.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-[#8B949E]">
              {uiLang === "hi" ? "अभी कोई गतिविधि नहीं।" : "No recent project updates yet."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {model.recentActivity.map((row) => (
                <li key={row.id}>
                  <Link
                    href={row.href}
                    className="group flex items-start justify-between gap-2 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-white/50 hover:bg-white/35 dark:hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{row.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{row.detail}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-white/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10">
                      {row.timeLabel}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </InsightPanel>
      </div>

      <InsightPanel
        title={uiLang === "hi" ? "व्यापार अंतर्दृष्टि" : "Business insights"}
        icon={Lightbulb}
        iconTone="indigo"
        className="lg:col-span-12"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {model.businessInsights.map((insight) => (
            <div
              key={insight.id}
              className={cn("ws-business-insight", `ws-business-insight--${insight.tone}`)}
            >
              <p className="text-xs font-bold text-slate-800 dark:text-white">{insight.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-[#8B949E]">{insight.body}</p>
              {insight.href && insight.cta ? (
                <Link
                  href={insight.href}
                  className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-900 dark:text-teal-300"
                >
                  {insight.cta}
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </InsightPanel>
    </div>
  );
}
