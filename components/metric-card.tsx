import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const iconToneStyles = {
  blue:
    "bg-sky-100/90 text-sky-700 ring-sky-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-teal-500/18 dark:text-teal-100 dark:ring-teal-300/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_24px_rgba(45,212,191,0.35)]",
  green:
    "bg-emerald-100/90 text-emerald-700 ring-emerald-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-emerald-500/18 dark:text-emerald-100 dark:ring-emerald-300/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_26px_rgba(52,211,153,0.38)]",
  amber:
    "bg-amber-100/90 text-amber-800 ring-amber-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-amber-950/45 dark:text-amber-200 dark:ring-amber-700/35 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  solar:
    "bg-teal-100/90 text-teal-800 ring-teal-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-teal-500/18 dark:text-teal-50 dark:ring-teal-300/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_26px_rgba(45,212,191,0.36)]",
  violet:
    "bg-violet-100/90 text-violet-700 ring-violet-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-700/35 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  rose:
    "bg-rose-100/90 text-rose-700 ring-rose-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-rose-950/45 dark:text-rose-200 dark:ring-rose-700/35 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
} as const;

export type MetricIconTone = keyof typeof iconToneStyles;

export interface MetricCardProps {
  label: string;
  value: string;
  countUpValue?: number | null;
  countUpFormat?: (value: number) => string;
  loading?: boolean;
  icon: LucideIcon;
  /** Soft tinted icon well — premium dashboard look */
  iconTone?: MetricIconTone;
  /** Hinglish delta vs last saved dashboard snapshot (device-local) */
  trend?: string | null;
}

export function MetricCard({
  label,
  value,
  countUpValue,
  countUpFormat,
  loading,
  icon: Icon,
  iconTone = "blue",
  trend
}: MetricCardProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [showFinal, setShowFinal] = useState(false);

  useEffect(() => {
    if (loading || countUpValue == null || !Number.isFinite(countUpValue)) {
      setAnimatedValue(0);
      setShowFinal(false);
      return;
    }
    if (typeof window === "undefined") return;
    const perfMode = document.documentElement.getAttribute("data-ss-perf-mode");
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const hasTouchScreen = (navigator.maxTouchPoints ?? 0) > 0;
    if (reduced || perfMode === "max-battery" || hasTouchScreen) {
      setAnimatedValue(countUpValue);
      setShowFinal(true);
      return;
    }

    let raf = 0;
    const durationMs = perfMode === "smooth" ? 650 : 950;
    const start = performance.now();
    setAnimatedValue(0);
    setShowFinal(false);

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(countUpValue * eased);
      if (progress < 1) {
        raf = window.requestAnimationFrame(tick);
      } else {
        setAnimatedValue(countUpValue);
        setShowFinal(true);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [countUpValue, loading]);

  const displayValue = useMemo(() => {
    if (countUpValue == null || !Number.isFinite(countUpValue)) return value;
    const current = showFinal ? countUpValue : animatedValue;
    return countUpFormat ? countUpFormat(current) : Math.round(current).toLocaleString("en-IN");
  }, [animatedValue, countUpFormat, countUpValue, showFinal, value]);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[16px] border border-slate-200/90 p-3.5 sm:p-4",
        "bg-white/34 shadow-[0_12px_40px_rgba(11,34,64,0.11),inset_0_1px_0_rgba(255,255,255,0.68)]",
        "backdrop-blur-xl backdrop-saturate-150 transition-[transform,box-shadow] duration-200 ease-out will-change-transform",
        "hover:scale-105 hover:shadow-[0_16px_48px_rgba(11,34,64,0.14),inset_0_1px_0_rgba(255,255,255,0.78)]",
        "motion-reduce:transition-shadow motion-reduce:hover:scale-100",
        "dark:border-white/10 dark:ss-dashboard-glass dark:backdrop-saturate-150 dark:shadow-[0_14px_44px_rgba(0,0,0,0.52)] dark:hover:shadow-[0_20px_56px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.06)]"
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-brand-400/15 to-solar-400/15 blur-2xl dark:from-teal-400/25 dark:to-emerald-400/20"
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 backdrop-blur-sm sm:h-11 sm:w-11",
            iconToneStyles[iconTone]
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500 dark:text-[#8B949E] sm:text-[11px]">
            {label}
          </p>
          {loading ? (
            <div className="mt-2 space-y-2 sm:mt-2.5" aria-busy="true">
              <Skeleton className="h-7 w-[4.5rem] rounded-lg bg-slate-200/90 dark:bg-slate-700/90 sm:h-8 sm:w-24" />
              <Skeleton className="h-3 w-16 rounded-md bg-slate-200/60 dark:bg-slate-700/60 sm:w-20" />
              <span className="sr-only">Loading {label}</span>
            </div>
          ) : (
            <>
              <p className="mt-1 break-words text-lg font-extrabold tabular-nums tracking-tight text-brand-700 dark:text-white sm:mt-1.5 sm:text-xl md:text-2xl">
                {displayValue}
              </p>
              {trend ? (
                <p
                  className="mt-2 text-[10px] font-semibold leading-snug text-slate-500 dark:text-[#8B949E] sm:text-[11px]"
                  aria-label={`Trend: ${trend}`}
                >
                  {trend}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
