"use client";

/**
 * Shared animation atoms for proposal block components.
 *
 * These are lightweight versions of the animation helpers in proposal-view.tsx.
 * Block components import from here rather than from proposal-view.tsx to avoid
 * circular dependency risks and keep imports clean.
 *
 * Visually identical to the originals — same easing, same count-up behavior.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import type { ProposalLang } from "@/lib/proposal-i18n";

// ─── Count-up hook ────────────────────────────────────────────────────────────

function normalizeTarget(t: number): number {
  return Math.max(0, Math.round(Number.isFinite(t) ? t : 0));
}

export function useBlockCountUp(target: number, inView: boolean, duration = 1.4): number {
  const safeTarget = normalizeTarget(target);
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const snap = () => setValue(safeTarget);
    window.addEventListener("beforeprint", snap);
    const mq = window.matchMedia("print");
    const onPrint = () => { if (mq.matches) snap(); };
    mq.addEventListener("change", onPrint);
    if (mq.matches) snap();
    return () => {
      window.removeEventListener("beforeprint", snap);
      mq.removeEventListener("change", onPrint);
    };
  }, [safeTarget]);

  useEffect(() => {
    if (reduced) { setValue(safeTarget); return; }
    if (!inView) return;
    let start: number | null = null;
    let raf = 0;
    setValue(0);
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * safeTarget));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [inView, safeTarget, duration, reduced]);

  return value;
}

// ─── AnimatedINR ─────────────────────────────────────────────────────────────

export function BlockAnimatedINR({
  value,
  prefix = "₹",
  className,
}: {
  value: number;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const counted = useBlockCountUp(value, inView);
  const shown = counted > 0 ? counted : normalizeTarget(value);
  return (
    <span ref={ref} className={className}>
      {prefix}{shown.toLocaleString("en-IN")}
    </span>
  );
}

// ─── BlockStatTile ────────────────────────────────────────────────────────────

export function BlockStatTile({
  label,
  value,
  rawValue,
  tone = "ink",
  delay = 0,
  dark = false,
  lang = "en",
}: {
  label: string;
  value: string;
  rawValue?: number;
  tone?: "ink" | "blue" | "green" | "rose" | "amber";
  delay?: number;
  dark?: boolean;
  lang?: ProposalLang;
}) {
  const toneClass =
    tone === "blue"  ? (dark ? "text-sky-300"     : "text-sky-700") :
    tone === "green" ? (dark ? "text-emerald-300" : "text-emerald-700") :
    tone === "rose"  ? (dark ? "text-rose-300"    : "text-rose-700") :
    tone === "amber" ? (dark ? "text-amber-300"   : "text-amber-700") :
    (dark ? "text-white" : "text-slate-900");

  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const counted = useBlockCountUp(rawValue ?? 0, inView && rawValue !== undefined);
  const displayValue =
    rawValue !== undefined
      ? value.startsWith("₹")
        ? `₹${counted.toLocaleString("en-IN")}`
        : counted.toLocaleString("en-IN") + value.replace(/^[\d,₹.]+/, "")
      : value;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.21, 1.02, 0.73, 1] }}
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
        dark
          ? "border-white/10 bg-white/5 backdrop-blur-sm"
          : "border-white/60 bg-white/80 backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
      }`}
    >
      <p
        className={`text-[10px] font-semibold ${dark ? "text-slate-400" : "text-slate-500"} ${
          lang === "hi" ? "tracking-normal normal-case" : "uppercase tracking-[0.18em]"
        }`}
      >
        {label}
      </p>
      <p className={`mt-2 break-words text-2xl font-bold leading-tight sm:text-3xl ${toneClass}`}>
        {displayValue}
      </p>
    </motion.div>
  );
}

// ─── BlockKicker ─────────────────────────────────────────────────────────────

export function BlockKicker({ text, lang, dark }: { text: string; lang?: ProposalLang; dark?: boolean }) {
  return (
    <p
      className={`text-xs font-semibold sm:text-sm ${dark ? "text-sky-400" : "text-sky-700"} ${
        lang === "hi" ? "tracking-normal" : "tracking-wide uppercase"
      }`}
    >
      {text}
    </p>
  );
}

// ─── BlockSectionTitle ────────────────────────────────────────────────────────

export function BlockSectionTitle({
  kicker,
  title,
  subtitle,
  dark,
  lang,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
  lang?: ProposalLang;
}) {
  return (
    <div className="mb-6 sm:mb-8">
      {kicker ? <BlockKicker text={kicker} lang={lang} dark={dark} /> : null}
      <h2
        className={`mt-2 text-balance text-2xl font-bold tracking-tight sm:text-3xl ${
          dark ? "text-white" : "text-slate-900"
        }`}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className={`mt-2 text-sm sm:text-base ${dark ? "text-slate-400" : "text-slate-600"}`}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// ─── BlockPanel ───────────────────────────────────────────────────────────────

export function BlockPanel({
  children,
  className,
  dark,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${
        dark
          ? "border-white/10 bg-white/5 backdrop-blur-sm"
          : "border-slate-200/70 bg-white/90 shadow-[0_4px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

// ─── BlockMetricRow ───────────────────────────────────────────────────────────

export function BlockMetricRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 ${
      accent ? "bg-sky-50 border border-sky-200" : "border border-slate-100 bg-slate-50/60"
    }`}>
      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</span>
      <span className={`text-base font-bold tabular-nums ${accent ? "text-sky-900" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}
