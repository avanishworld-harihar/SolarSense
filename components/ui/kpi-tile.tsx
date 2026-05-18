"use client";

/**
 * KpiTile — unified KPI / metric card primitive.
 *
 * Consolidates four parallel implementations from the E0 audit:
 *   1. `MetricCard` in metric-card.tsx                            (dashboard)
 *   2. `BlockStatTile` in proposal-block-utils.tsx                (residential proposal)
 *   3. `KpiCard` in commercial-shared.tsx                         (commercial proposal)
 *   4. Local `MetricCard` in harihar-solar-calculator-client.tsx  (acquisition landing)
 *
 * density:
 *   "dashboard"   — MetricCard style: icon well + trend line + loading skeleton
 *                   Uses .glass-metric-tile CSS class (preserves existing dark-mode polish)
 *   "block"       — BlockStatTile style: smaller, proposal block context, Hindi support
 *   "commercial"  — KpiCard style: large hero number, tinted gradient background, no icon
 *
 * All original components remain in place and continue to work.
 * New surfaces and future presets should use KpiTile from here.
 *
 * Design tokens used: DS.tone (accent palette), DS.weight, DS.type
 */

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONES, EASING, DURATION, type ToneKey } from "@/lib/design-system";
import { IconWell } from "@/components/ui/icon-well";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/components/ui/count-up-hook";

export type KpiDensity = "dashboard" | "block" | "commercial";

// ─── Shared props ─────────────────────────────────────────────────────────────

export interface KpiTileBaseProps {
  /** Visible label above the number */
  label: string;
  /** Pre-formatted string value to display (used when countUpValue is not set) */
  value: string;
  /**
   * Raw numeric target for count-up animation.
   * When provided, the value prop is used as the fallback static display only.
   */
  countUpValue?: number | null;
  /**
   * Custom formatter for the animated number.
   * Defaults to en-IN locale integer.
   */
  countUpFormat?: (n: number) => string;
  /** Accent tone from the DS palette */
  tone?: ToneKey;
  /** Secondary sub-label below the number */
  sub?: string;
  /** Stagger animation delay in seconds */
  delay?: number;
  className?: string;
}

// ─── Dashboard density extras ─────────────────────────────────────────────────

export interface KpiTileDashboardProps extends KpiTileBaseProps {
  density: "dashboard";
  /** Required icon for dashboard density */
  icon: LucideIcon;
  /** Loading state — shows skeleton */
  loading?: boolean;
  /** Trend / delta string (e.g. "+12 this month") */
  trend?: string | null;
  /** Stronger emphasis surface (hero financial metric) */
  emphasis?: boolean;
  /** Alert tint (e.g. overdue payment) */
  alert?: boolean;
}

// ─── Block density extras ─────────────────────────────────────────────────────

export interface KpiTileBlockProps extends KpiTileBaseProps {
  density: "block";
  /** Language hint — adjusts label tracking for Hindi */
  lang?: "en" | "hi";
  /** Dark surface flag */
  dark?: boolean;
}

// ─── Commercial density extras ────────────────────────────────────────────────

export interface KpiTileCommercialProps extends KpiTileBaseProps {
  density: "commercial";
  /** Optional leading icon inside the icon badge */
  icon?: React.ReactNode;
}

export type KpiTileProps =
  | KpiTileDashboardProps
  | KpiTileBlockProps
  | KpiTileCommercialProps;

// ─── Dashboard implementation ─────────────────────────────────────────────────

function KpiTileDashboard({
  label,
  value,
  countUpValue,
  countUpFormat,
  tone = "sky",
  icon,
  loading = false,
  trend,
  emphasis = false,
  alert = false,
  delay = 0,
  className,
}: KpiTileDashboardProps) {
  const displayed = useCountUp(countUpValue ?? 0, {
    inView: !loading && countUpValue != null,
    durationMs: DURATION.countUp,
    format: countUpFormat,
    // Dashboard: skip animation on touch (matches original MetricCard behavior)
    animateOnTouch: false,
  });

  const finalDisplay =
    countUpValue != null && !loading ? displayed : value;

  return (
    <div
      className={cn(
        "glass-metric-tile group p-3.5 sm:p-4",
        emphasis && "glass-metric-tile--emphasis",
        alert && "glass-metric-tile--alert",
        "motion-reduce:hover:translate-y-0",
        "dark:!border-white/10 dark:!bg-transparent dark:ss-dashboard-glass dark:shadow-[0_14px_44px_rgba(0,0,0,0.52)]",
        className
      )}
    >
      {/* Ambient glow blob */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-brand-400/15 to-solar-400/15 blur-2xl dark:from-teal-400/25 dark:to-emerald-400/20"
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <IconWell icon={icon} tone={tone} size="md" />
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
              <p className="mt-1 break-words text-lg font-bold tabular-nums tracking-tight text-brand-800 dark:font-extrabold dark:text-white sm:mt-1.5 sm:text-xl md:text-2xl">
                {finalDisplay}
              </p>
              {trend ? (
                <p className="mt-2 text-[10px] font-semibold leading-snug text-slate-500 dark:text-[#8B949E] sm:text-[11px]">
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

// ─── Block implementation ─────────────────────────────────────────────────────

function KpiTileBlock({
  label,
  value,
  countUpValue,
  countUpFormat,
  tone = "sky",
  dark = false,
  lang = "en",
  sub,
  delay = 0,
  className,
}: KpiTileBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const reduced = useReducedMotion();

  const displayed = useCountUp(countUpValue ?? 0, {
    inView: inView && countUpValue != null && !reduced,
    durationMs: DURATION.countUpDeck,
    format: countUpFormat,
    animateOnTouch: true,
  });

  const toneClass = dark
    ? tone === "sky"     ? "text-sky-300"     :
      tone === "emerald" ? "text-emerald-300"  :
      tone === "amber"   ? "text-amber-300"    :
      tone === "rose"    ? "text-rose-300"     :
      tone === "solar"   ? "text-teal-300"     :
      "text-violet-300"
    : TONES[tone].value;

  const displayValue =
    countUpValue != null ? displayed : value;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: EASING.bounce }}
      className={cn(
        "rounded-2xl border p-4 shadow-sm sm:p-5",
        dark
          ? "border-white/10 bg-white/5 backdrop-blur-sm"
          : "border-white/60 bg-white/80 backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      <p
        className={cn(
          "text-[10px] font-semibold",
          dark ? "text-slate-400" : "text-slate-500",
          lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-[0.18em]"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-2 break-words text-2xl font-bold leading-tight tabular-nums sm:text-3xl",
          toneClass
        )}
      >
        {displayValue}
      </p>
      {sub && (
        <p className={cn("mt-1 text-xs font-medium", dark ? "text-slate-400" : "text-slate-500")}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

// ─── Commercial implementation ────────────────────────────────────────────────

function KpiTileCommercial({
  label,
  value,
  countUpValue,
  countUpFormat,
  tone = "sky",
  sub,
  icon,
  delay = 0,
  className,
}: KpiTileCommercialProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const displayed = useCountUp(countUpValue ?? 0, {
    inView: inView && countUpValue != null,
    durationMs: DURATION.countUpDeck,
    format: countUpFormat,
    animateOnTouch: true, // commercial = presentation, animate on iPad
  });

  const tc = TONES[tone];
  const displayValue = countUpValue != null ? displayed : value;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay, duration: 0.5, ease: EASING.reveal }}
      className={cn(
        "rounded-2xl border p-6",
        tc.bg,
        tc.border,
        className
      )}
    >
      {/* Icon + label row */}
      <div className="mb-3 flex items-center gap-2">
        {icon && (
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-white/70", tc.icon)}>
            {icon}
          </span>
        )}
        <span className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", tc.label)}>
          {label}
        </span>
      </div>

      {/* Main value */}
      <div className={cn("text-4xl font-black leading-none tabular-nums tracking-tight md:text-5xl", tc.value)}>
        {displayValue}
      </div>

      {/* Sub-label */}
      {sub && (
        <p className={cn("mt-2 text-[11px] font-medium leading-snug", tc.sub)}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

// ─── Unified export ───────────────────────────────────────────────────────────

export function KpiTile(props: KpiTileProps) {
  if (props.density === "dashboard") return <KpiTileDashboard {...props} />;
  if (props.density === "block")     return <KpiTileBlock {...props} />;
  return <KpiTileCommercial {...(props as KpiTileCommercialProps)} />;
}
