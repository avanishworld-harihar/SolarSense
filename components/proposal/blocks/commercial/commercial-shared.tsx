"use client";

/**
 * commercial-shared.tsx — shared primitives for the Commercial Executive Proposal.
 *
 * Exports:
 *   CountUp            — animated number that counts up on first viewport entry
 *   SectionReveal      — framer-motion wrapper: fade + slide up on scroll
 *   CommercialSectionHeader — premium section header (number · rule · title · subtitle)
 *   GlassPanel         — white glassmorphism card with optional glow ring
 */

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// ─── CountUp ─────────────────────────────────────────────────────────────────
// Counts from 0 to `target` using a spring animation, triggered once on first
// viewport entry. Supports prefix/suffix and decimal places.

export function CountUp({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 45, damping: 16 });
  const [started, setStarted] = useState(false);
  const [display, setDisplay] = useState(
    decimals > 0 ? (0).toFixed(decimals) : "0"
  );

  // Start counting once the element enters the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (started) motionVal.set(target);
  }, [started, target, motionVal]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      setDisplay(
        decimals > 0
          ? latest.toFixed(decimals)
          : Math.round(latest).toLocaleString("en-IN")
      );
    });
  }, [spring, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

// ─── SectionReveal ────────────────────────────────────────────────────────────
// Wraps children in a scroll-triggered fade + slide-up. Use once per major block.

export function SectionReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-72px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── CommercialSectionHeader ─────────────────────────────────────────────────
// Unified section header used by every commercial block.
// Layout: num · divider line · label tag
//         large title
//         subtle subtitle

export function CommercialSectionHeader({
  num,
  label,
  title,
  subtitle,
}: {
  num: string;
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <SectionReveal className="mb-12">
      {/* Section number + label */}
      <div className="mb-5 flex items-center gap-4">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-slate-300 tabular-nums">
          {num}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
        <span className="rounded-full border border-sky-200/80 bg-sky-50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-600">
          {label}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-3xl font-bold leading-[1.15] tracking-tight text-slate-900 md:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-500">
          {subtitle}
        </p>
      )}
    </SectionReveal>
  );
}

// ─── GlassPanel ──────────────────────────────────────────────────────────────
// White glassmorphism card. Use `glow` for sky-accented highlight state.

export function GlassPanel({
  children,
  className = "",
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white ${
        glow
          ? "border-sky-200/70 shadow-[0_4px_32px_rgba(14,165,233,0.10)]"
          : "border-slate-200/80 shadow-[0_2px_24px_rgba(15,23,42,0.06)]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ─── DarkGlassPanel ──────────────────────────────────────────────────────────
// Dark glassmorphism card for dark sections.

export function DarkGlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────
// Premium KPI tile used in ROI and Financials sections.

type KpiCardProps = {
  label: string;
  value: string | React.ReactNode;
  sub?: string;
  accent: "emerald" | "sky" | "indigo" | "violet" | "amber" | "rose";
  delay?: number;
  icon?: React.ReactNode;
};

const ACCENT_MAP: Record<
  KpiCardProps["accent"],
  { bg: string; border: string; label: string; value: string; icon: string; sub: string }
> = {
  emerald: {
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/60",
    border: "border-emerald-200/80",
    label: "text-emerald-600",
    value: "text-emerald-800",
    icon: "text-emerald-500",
    sub: "text-emerald-600/70",
  },
  sky: {
    bg: "bg-gradient-to-br from-sky-50 to-sky-100/60",
    border: "border-sky-200/80",
    label: "text-sky-600",
    value: "text-sky-800",
    icon: "text-sky-500",
    sub: "text-sky-600/70",
  },
  indigo: {
    bg: "bg-gradient-to-br from-indigo-50 to-indigo-100/60",
    border: "border-indigo-200/80",
    label: "text-indigo-600",
    value: "text-indigo-800",
    icon: "text-indigo-500",
    sub: "text-indigo-600/70",
  },
  violet: {
    bg: "bg-gradient-to-br from-violet-50 to-violet-100/60",
    border: "border-violet-200/80",
    label: "text-violet-600",
    value: "text-violet-800",
    icon: "text-violet-500",
    sub: "text-violet-600/70",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-50 to-amber-100/60",
    border: "border-amber-200/80",
    label: "text-amber-600",
    value: "text-amber-800",
    icon: "text-amber-500",
    sub: "text-amber-600/70",
  },
  rose: {
    bg: "bg-gradient-to-br from-rose-50 to-rose-100/60",
    border: "border-rose-200/80",
    label: "text-rose-600",
    value: "text-rose-800",
    icon: "text-rose-500",
    sub: "text-rose-600/70",
  },
};

export function KpiCard({ label, value, sub, accent, delay = 0, icon }: KpiCardProps) {
  const ac = ACCENT_MAP[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl border p-6 ${ac.bg} ${ac.border}`}
    >
      {/* Icon + label row */}
      <div className="mb-3 flex items-center gap-2">
        {icon && <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white/70 ${ac.icon}`}>{icon}</span>}
        <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${ac.label}`}>
          {label}
        </span>
      </div>

      {/* Main value */}
      <div className={`text-4xl font-black leading-none tabular-nums tracking-tight md:text-5xl ${ac.value}`}>
        {value}
      </div>

      {/* Sub-label */}
      {sub && (
        <p className={`mt-2 text-[11px] font-medium leading-snug ${ac.sub}`}>{sub}</p>
      )}
    </motion.div>
  );
}
