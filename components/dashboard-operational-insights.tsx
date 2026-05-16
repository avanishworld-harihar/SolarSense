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
  CircleDollarSign,
  ClipboardCheck,
  HardHat,
  TrendingUp
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

function InsightPanel({
  title,
  icon: Icon,
  children,
  className
}: {
  title: string;
  icon: typeof Activity;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("glass-panel-premium flex flex-col p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 text-brand-700 shadow-sm ring-1 ring-white/80 dark:bg-white/10 dark:text-teal-200 dark:ring-white/10">
          <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </span>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-[#8B949E]">{title}</h3>
      </div>
      {children}
    </article>
  );
}

export function DashboardOperationalInsights({ stats, trends, loading, className }: DashboardOperationalInsightsProps) {
  const { t, locale } = useLanguage();
  const uiLang = locale === "en" ? "en" : "hi";
  const model = buildOperationalInsights(stats, trends ?? null, uiLang);

  if (loading && !stats) {
    return (
      <div className={cn("grid gap-4 sm:gap-5 lg:grid-cols-2", className)}>
        {[0, 1, 2, 3].map((i) => (
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
          title={uiLang === "hi" ? "पाइपलाइन स्वास्थ्य" : "Pipeline health"}
          icon={TrendingUp}
          className="lg:col-span-7"
        >
          <div className="space-y-3">
            {model.pipeline.stages.map((stage) => (
              <div key={stage.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-[#C9D1D9]">{stage.label}</span>
                  <span className="tabular-nums font-bold text-brand-800 dark:text-white">{stage.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500 transition-[width] duration-500"
                    style={{ width: `${Math.max(stage.widthPct, stage.count > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
            <p
              className={cn(
                "text-sm leading-relaxed",
                model.pipeline.tone === "good" && "text-emerald-800 dark:text-emerald-300",
                model.pipeline.tone === "warn" && "text-amber-900 dark:text-amber-200",
                model.pipeline.tone === "neutral" && "text-slate-600 dark:text-[#8B949E]"
              )}
            >
              {model.pipeline.summary}
            </p>
          </div>
        </InsightPanel>

        <InsightPanel
          title={uiLang === "hi" ? "ऑपरेशन अलर्ट" : "Operational alerts"}
          icon={AlertTriangle}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-6">
          <article className="glass-metric-tile glass-metric-tile--emphasis p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100/90 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                <CircleDollarSign className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t("metrics_revenue")}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-brand-900 dark:text-white">{model.revenue.value}</p>
                {model.revenue.trend ? (
                  <p className="mt-1.5 text-[11px] font-medium text-slate-500 dark:text-[#8B949E]">{model.revenue.trend}</p>
                ) : null}
              </div>
            </div>
          </article>
          <article
            className={cn("glass-metric-tile p-4", stats && stats.pendingPayments > 0 && "glass-metric-tile--alert")}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100/90 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
                <CircleDollarSign className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t("metrics_pending")}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-brand-900 dark:text-white">{model.collections.value}</p>
                {model.collections.trend ? (
                  <p className="mt-1.5 text-[11px] font-medium text-slate-500 dark:text-[#8B949E]">{model.collections.trend}</p>
                ) : null}
              </div>
            </div>
          </article>
        </div>

        <InsightPanel
          title={uiLang === "hi" ? "हाल की गतिविधि" : "Recent activity"}
          icon={Activity}
          className="lg:col-span-6"
        >
          {model.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-[#8B949E]">
              {uiLang === "hi" ? "अभी कोई गतिविधि नहीं।" : "No recent project updates yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {model.recentActivity.map((row) => (
                <li key={row.id}>
                  <Link
                    href={row.href}
                    className="group flex items-start justify-between gap-3 rounded-lg px-1 py-1.5 hover:bg-white/40 dark:hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{row.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{row.detail}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-400">{row.timeLabel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </InsightPanel>
      </div>
    </div>
  );
}
