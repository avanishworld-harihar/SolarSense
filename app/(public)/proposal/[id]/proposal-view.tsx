"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Building2,
  CheckCircle2,
  Download,
  Factory,
  Gauge,
  Home,
  Languages,
  Leaf,
  MessageCircle,
  Moon,
  Phone,
  ShieldCheck,
  Sparkles,
  Sun,
  TreeDeciduous,
  XCircle,
  Zap
} from "lucide-react";
import type { ProposalDeckSummary } from "@/lib/proposal-ppt";
import { dict, monthLabels, type ProposalDict, type ProposalLang } from "@/lib/proposal-i18n";
import { profileFieldOrDash, type EmiRow } from "@/lib/proposal-deck-helpers";

// ---------------------------------------------------------------------------
// Count-up animation hook
// ---------------------------------------------------------------------------
function useCountUp(target: number, inView: boolean, duration = 1.4) {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { setValue(target); return; }
    if (!inView) return;
    let start: number | null = null;
    let raf: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration, reduced]);
  return value;
}

function AnimatedINR({ value, prefix = "₹", className }: { value: number; prefix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const counted = useCountUp(value, inView);
  return (
    <span ref={ref} className={className}>
      {prefix}{counted.toLocaleString("en-IN")}
    </span>
  );
}

function AnimatedNumber({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const counted = useCountUp(value, inView);
  return (
    <span ref={ref} className={className}>
      {counted.toLocaleString("en-IN")}{suffix}
    </span>
  );
}

type ProposalViewProps = {
  id: string;
  customerName: string;
  generatedAt: string;
  summary: ProposalDeckSummary;
  installer: {
    name: string;
    contact: string;
    tagline: string;
  };
  /** Optional photo URLs for the About + Closing slides. */
  siteImages?: string[];
  /** Optional company logo URL. */
  installerLogoUrl?: string;
};

const inr = (v: number) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`;
const inrK = (v: number) => {
  const x = Math.max(0, Math.round(v));
  if (x >= 100000) return `₹${(x / 100000).toFixed(1)}L`;
  if (x >= 1000) return `₹${(x / 1000).toFixed(0)}k`;
  return `₹${x.toLocaleString("en-IN")}`;
};

// ---------------------------------------------------------------------------
// Reusable atoms
// ---------------------------------------------------------------------------

function StatTile({
  label,
  value,
  rawValue,
  tone = "ink",
  delay = 0,
  dark = false
}: {
  label: string;
  value: string;
  rawValue?: number;
  tone?: "ink" | "blue" | "green" | "rose";
  delay?: number;
  dark?: boolean;
}) {
  const toneClass =
    tone === "blue" ? (dark ? "text-sky-300" : "text-sky-700") :
    tone === "green" ? (dark ? "text-emerald-300" : "text-emerald-700") :
    tone === "rose" ? (dark ? "text-rose-300" : "text-rose-700") :
    (dark ? "text-white" : "text-slate-900");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const counted = useCountUp(rawValue ?? 0, inView && rawValue !== undefined);
  const displayValue = rawValue !== undefined
    ? (value.startsWith("₹") ? `₹${counted.toLocaleString("en-IN")}` : counted.toLocaleString("en-IN") + value.replace(/^[\d,₹.]+/, ""))
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
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-2 text-2xl font-bold sm:text-3xl ${toneClass}`}>{displayValue}</p>
    </motion.div>
  );
}

function SectionHeader({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.32em] text-sky-700">{kicker}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-600 sm:text-base">{subtitle}</p> : null}
    </header>
  );
}

function MonthlyBillsChart({ values, labels, peakIndices }: { values: number[]; labels: string[]; peakIndices?: number[] }) {
  const max = Math.max(1, ...values);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const reduced = useReducedMotion();
  const peakSet = new Set(peakIndices ?? []);
  return (
    <div ref={ref} className="flex h-44 items-end gap-1.5 sm:h-56 sm:gap-2">
      {values.map((v, i) => {
        const target = (v / max) * 100;
        const isPeak = peakSet.has(i);
        return (
          <div key={`${labels[i]}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
            <motion.div
              initial={reduced ? { height: `${target}%`, opacity: 1 } : { height: 0, opacity: 0.4 }}
              animate={inView ? { height: `${target}%`, opacity: 1 } : undefined}
              transition={{ duration: 0.9, delay: i * 0.04, ease: [0.21, 1.02, 0.73, 1] }}
              className={`w-full rounded-t-md ${
                isPeak
                  ? "bg-gradient-to-t from-rose-600 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5),0_2px_8px_rgba(244,63,94,0.35)]"
                  : "bg-gradient-to-t from-sky-600 to-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.4),0_2px_8px_rgba(14,165,233,0.25)]"
              }`}
              aria-label={`${labels[i]}: ${v}`}
              style={{ minHeight: target > 0 ? 4 : 0 }}
            />
            <span className="text-[10px] font-medium text-slate-500">{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function GenVsUseChart({
  labels,
  gen,
  use,
  legendGen,
  legendUse
}: {
  labels: string[];
  gen: number[];
  use: number[];
  legendGen: string;
  legendUse: string;
}) {
  const max = Math.max(1, ...gen, ...use);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const reduced = useReducedMotion();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> {legendGen}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sky-700">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> {legendUse}
        </span>
      </div>
      <div ref={ref} className="flex h-44 items-end gap-1 sm:h-56">
        {labels.map((label, i) => {
          const tg = (gen[i] / max) * 100;
          const tu = (use[i] / max) * 100;
          return (
            <div key={`${label}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-end gap-0.5">
                <motion.div
                  initial={reduced ? { height: `${tg}%` } : { height: 0 }}
                  animate={inView ? { height: `${tg}%` } : undefined}
                  transition={{ duration: 0.8, delay: i * 0.04 }}
                  className="flex-1 rounded-t-sm bg-emerald-500"
                  style={{ minHeight: tg > 0 ? 2 : 0 }}
                />
                <motion.div
                  initial={reduced ? { height: `${tu}%` } : { height: 0 }}
                  animate={inView ? { height: `${tu}%` } : undefined}
                  transition={{ duration: 0.8, delay: i * 0.04 + 0.05 }}
                  className="flex-1 rounded-t-sm bg-sky-500"
                  style={{ minHeight: tu > 0 ? 2 : 0 }}
                />
              </div>
              <span className="text-[10px] font-medium text-slate-500">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SolarVsGridChart({
  years,
  grid,
  solar
}: {
  years: number[];
  grid: number[];
  solar: number[];
}) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const reduced = useReducedMotion();
  const maxY = Math.max(...grid, ...solar, 1);
  const W = 600;
  const H = 280;
  const pad = { l: 56, r: 12, t: 16, b: 28 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const xs = years.map((_, i) => pad.l + (i / Math.max(1, years.length - 1)) * innerW);
  const ysGrid = grid.map((v) => pad.t + innerH - (v / maxY) * innerH);
  const ysSolar = solar.map((v) => pad.t + innerH - (v / maxY) * innerH);
  const lineGrid = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ysGrid[i].toFixed(1)}`).join(" ");
  const lineSolar = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ysSolar[i].toFixed(1)}`).join(" ");
  const axisTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-72 w-full sm:h-80">
      {axisTicks.map((t, i) => {
        const y = pad.t + innerH - t * innerH;
        const v = Math.round(maxY * t);
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
            <text x={pad.l - 8} y={y + 4} fontSize={10} textAnchor="end" fill="#64748B">
              ₹{(v / 1000).toFixed(0)}k
            </text>
          </g>
        );
      })}
      {years.map((y, i) => (
        <text key={y} x={xs[i]} y={H - 8} fontSize={10} textAnchor="middle" fill="#64748B">
          {y}y
        </text>
      ))}
      <motion.path
        d={lineGrid}
        fill="none"
        stroke="#E11D48"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : undefined}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
      <motion.path
        d={lineSolar}
        fill="none"
        stroke="#0A6CF1"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : undefined}
        transition={{ duration: 1.4, delay: 0.25, ease: "easeInOut" }}
      />
      {ysGrid.map((y, i) => (
        <motion.circle
          key={`g${i}`}
          cx={xs[i]}
          cy={y}
          r={3.5}
          fill="#E11D48"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : undefined}
          transition={{ delay: 1 + i * 0.06 }}
        />
      ))}
      {ysSolar.map((y, i) => (
        <motion.circle
          key={`s${i}`}
          cx={xs[i]}
          cy={y}
          r={3.5}
          fill="#0A6CF1"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : undefined}
          transition={{ delay: 1.2 + i * 0.06 }}
        />
      ))}
    </svg>
  );
}

function CtaButton({
  href,
  onClick,
  children,
  variant = "primary",
  external = false
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  external?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all active:scale-95 sm:text-base";
  const styles = {
    primary: "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800",
    secondary: "border border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100"
  } as const;
  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={`${base} ${styles[variant]}`}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Slide-style sections — matching the 12 PPT slides.
// ---------------------------------------------------------------------------

function HeroCover({
  D,
  summary,
  installerLogoUrl,
  location
}: {
  D: ProposalDict;
  summary: ProposalDeckSummary;
  installerLogoUrl?: string;
  location?: string;
}) {
  const cp = summary.customerProfile;
  return (
    <section className="rounded-3xl bg-gradient-to-br from-sky-50 via-white to-white p-6 sm:p-10">
      <div className="flex items-center gap-3">
        {installerLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={installerLogoUrl} alt={summary.installer} className="h-10 w-10 rounded-lg object-contain" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Sun className="h-5 w-5" />
          </div>
        )}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-slate-900">{summary.installer}</p>
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{summary.tagline}</p>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-8 text-xs font-semibold uppercase tracking-[0.32em] text-sky-700"
      >
        {D["slide.cover.kicker"]}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl"
      >
        {summary.honoredName}
      </motion.h1>
      {location ? (
        <p className="mt-1 text-sm text-slate-600 sm:text-base">{location}</p>
      ) : null}

      {/* Customer profile grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { l: D["profile.consumerId"], v: profileFieldOrDash(cp.consumerId) },
          { l: D["profile.meterNo"], v: profileFieldOrDash(cp.meterNumber) },
          { l: D["profile.connectionDate"], v: profileFieldOrDash(cp.connectionDate) },
          { l: D["profile.connectionType"], v: profileFieldOrDash(cp.connectionType) },
          { l: D["profile.phase"], v: profileFieldOrDash(cp.phase) },
          { l: D["profile.sanctionedLoad"], v: cp.sanctionedLoadKw ? `${cp.sanctionedLoadKw} kW` : "—" }
        ].map((c) => (
          <div key={c.l} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{c.l}</p>
            <p className="mt-1 text-sm font-bold text-slate-900 sm:text-base">{c.v}</p>
          </div>
        ))}
      </div>

      {/* System summary bar */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label={D["common.system"]} value={`${summary.systemKw} kW`} delay={0.05} />
        <StatTile label={D["common.panels"]} value={String(summary.panels)} rawValue={summary.panels} delay={0.1} />
        <StatTile label={D["common.netCost"]} value={inrK(summary.netCost)} rawValue={summary.netCost} tone="blue" delay={0.15} />
        <StatTile label={D["common.payback"]} value={`${summary.paybackYears.toFixed(1)} ${D["emi.years"]}`} tone="green" delay={0.2} />
        <StatTile label={D["common.lifeProfit"]} value={inrK(summary.lifetime25Profit)} rawValue={summary.lifetime25Profit} tone={summary.lifetime25Profit > 0 ? "green" : "rose"} delay={0.25} />
      </div>
      <p className="mt-3 text-[11px] italic text-slate-500">{D["common.engineNote"]}</p>
    </section>
  );
}

function DeepAuditSection({ D, summary, monthLbls }: { D: ProposalDict; summary: ProposalDeckSummary; monthLbls: string[] }) {
  return (
    <section className="mt-12 sm:mt-16">
      <SectionHeader kicker={D["slide.audit.kicker"]} title={D["slide.audit.title"]} subtitle={D["slide.audit.subtitle"]} />

      {/* Bar chart with summer trap highlight */}
      <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-6">
        <MonthlyBillsChart values={summary.auditRows.map((r) => r.total)} labels={monthLbls} peakIndices={[3, 4, 5, 6]} />
      </div>

      {/* Month-wise table */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">{D["audit.month"]}</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">{D["audit.units"]}</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">{D["audit.energy"]}</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">{D["audit.fixed"]}</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">{D["audit.dutyFuel"]}</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">{D["audit.netBill"]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summary.auditRows.map((r, i) => {
              const isPeak = i >= 3 && i <= 6;
              return (
                <tr key={r.label} className={isPeak ? "bg-rose-50/60" : i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                  <td className="px-3 py-2 font-semibold text-slate-900">{monthLbls[i]}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{r.units}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{inr(r.energy)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{inr(r.fixed)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{inr(r.duty + r.fuel)}</td>
                  <td className={`px-3 py-2 text-right font-bold ${isPeak ? "text-rose-700" : "text-slate-900"}`}>{inr(r.total)}</td>
                </tr>
              );
            })}
            <tr className="bg-sky-50 font-bold text-sky-900">
              <td className="px-3 py-2">{D["audit.total"]}</td>
              <td className="px-3 py-2 text-right">{summary.auditTotals.units}</td>
              <td className="px-3 py-2 text-right">{inr(summary.auditTotals.energy)}</td>
              <td className="px-3 py-2 text-right">{inr(summary.auditTotals.fixed)}</td>
              <td className="px-3 py-2 text-right">{inr(summary.auditTotals.duty + summary.auditTotals.fuel)}</td>
              <td className="px-3 py-2 text-right">{inr(summary.auditTotals.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Insight cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50 to-rose-100/50 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700">{D["insight.summer.title"]}</p>
          <p className="mt-2 text-2xl font-bold text-rose-900 sm:text-3xl">
            <AnimatedNumber value={summary.summerPct} suffix="%" />
          </p>
          <p className="mt-1 text-xs text-rose-800">{D["insight.summer.sub"]}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">{D["insight.fixed.title"]}</p>
          <p className="mt-2 text-2xl font-bold text-amber-900 sm:text-3xl">
            <AnimatedINR value={summary.fixedAnnual} />
          </p>
          <p className="mt-1 text-xs text-amber-800">{D["insight.fixed.sub"]}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">{D["insight.duty.title"]}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            <AnimatedINR value={summary.auditTotals.duty + summary.auditTotals.fuel} />
          </p>
          <p className="mt-1 text-xs text-slate-700">{D["insight.duty.sub"]}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">{D["insight.solar.title"]}</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900 sm:text-3xl">
            <AnimatedNumber value={summary.totalReduction} suffix="%" />
          </p>
          <p className="mt-1 text-xs text-emerald-800"><AnimatedINR value={summary.annualSaving} /> / yr</p>
        </div>
      </div>
    </section>
  );
}

function EconomicsSection({
  D,
  summary,
  monthLbls
}: {
  D: ProposalDict;
  summary: ProposalDeckSummary;
  monthLbls: string[];
}) {
  const monthlyGen = Math.round(summary.annualGen / 12);
  const [selectedTenure, setSelectedTenure] = useState<number | null>(summary.emi[1]?.tenureYears ?? null);
  const [showFinance, setShowFinance] = useState(false);

  return (
    <section className="mt-12 sm:mt-16">
      <SectionHeader kicker={D["slide.economics.kicker"]} title={D["slide.economics.title"]} subtitle={D["slide.economics.subtitle"]} />

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Generation vs Usage */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{D["gen.title"]}</p>
          <div className="mt-4">
            <GenVsUseChart
              labels={monthLbls}
              gen={summary.auditRows.map(() => monthlyGen)}
              use={summary.auditRows.map((r) => r.units)}
              legendGen={D["gen.annualGen"]}
              legendUse={D["gen.annualUse"]}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{D["gen.annualGen"]}</p>
              <p className="mt-1 text-lg font-bold text-emerald-900">{summary.annualGen.toLocaleString("en-IN")} u</p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">{D["gen.coverage"]}</p>
              <p className="mt-1 text-lg font-bold text-sky-900">{summary.coverage}%</p>
            </div>
          </div>
        </div>

        {/* EMI calculator */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{D["emi.title"]}</p>
            <button
              type="button"
              onClick={() => setShowFinance((s) => !s)}
              className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white"
            >
              {showFinance ? "−" : "+"} {D["emi.financeCta"]}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {D["emi.principal"]}: <span className="font-semibold text-slate-700">{inr(summary.netCost)}</span>
            {" · "}
            {D["emi.rate"]}: 7% p.a.
          </p>
          <div className="mt-4 space-y-2">
            {summary.emi.map((row) => {
              const selected = selectedTenure === row.tenureYears;
              return (
                <button
                  type="button"
                  key={row.tenureYears}
                  onClick={() => setSelectedTenure(row.tenureYears)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${selected ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div>
                    <p className={`text-sm font-bold ${selected ? "text-emerald-900" : "text-slate-900"}`}>
                      {row.tenureYears} {D["emi.years"]}
                    </p>
                    <p className="text-[11px] text-slate-500">{D["emi.totalInterest"]}: {inr(row.totalInterest)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-bold ${selected ? "text-emerald-700" : "text-slate-900"}`}>
                      {inr(row.monthlyEmi)}<span className="text-[11px] font-medium text-slate-500">/mo</span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          {showFinance ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              className="mt-4 rounded-xl bg-slate-900 p-4 text-white"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-sky-300">{D["emi.financeCta"]}</p>
              <p className="mt-2 text-xs text-slate-300">
                {selectedTenure
                  ? `${selectedTenure} ${D["emi.years"]} · ${inr(summary.emi.find((r) => r.tenureYears === selectedTenure)?.monthlyEmi ?? 0)}/mo`
                  : D["emi.title"]}
              </p>
              <a
                href="https://wa.me/?text=Hi%2C%20I%20am%20interested%20in%20a%20Solar%20Loan."
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Connect with us
              </a>
            </motion.div>
          ) : null}
        </div>
      </div>

      {/* 25-yr comparison */}
      <div className="mt-8 grid gap-4 sm:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-3 sm:p-6">
          <SolarVsGridChart
            years={summary.solarVsGrid.years}
            grid={summary.solarVsGrid.gridCumulative}
            solar={summary.solarVsGrid.solarCumulative}
          />
        </div>
        <div className="grid gap-3 sm:col-span-2">
          <StatTile label="25-yr Grid Cost" value={inr(summary.solarVsGrid.totalGrid)} tone="rose" />
          <StatTile label="25-yr Solar Cost" value={inr(summary.solarVsGrid.totalSolar)} tone="blue" />
          <StatTile label="Net Saving" value={inr(summary.solarVsGrid.netSaving)} tone="green" />
        </div>
      </div>
    </section>
  );
}

function TreeAnimation({ count, inView }: { count: number; inView: boolean }) {
  const treesPerRow = 8;
  const maxTrees = Math.min(count, 24);
  const rows = Math.ceil(maxTrees / treesPerRow);
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {Array.from({ length: maxTrees }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, y: 8 }}
          animate={inView ? { opacity: 1, scale: 1, y: 0 } : undefined}
          transition={{ duration: 0.4, delay: 0.5 + i * 0.04, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <TreeDeciduous className="h-5 w-5 text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
        </motion.div>
      ))}
      {count > maxTrees && (
        <span className="self-center text-xs font-bold text-emerald-700">+{(count - maxTrees).toLocaleString("en-IN")}</span>
      )}
    </div>
  );
}

function EnvironmentSection({ D, summary }: { D: ProposalDict; summary: ProposalDeckSummary }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const treeCount = useCountUp(summary.environmental.treeEquivalent, inView);
  const co2Count = useCountUp(summary.environmental.lifetimeCo2TonsSaved, inView);
  const genCount = useCountUp(summary.annualGen, inView);

  // 1-year tree equivalent
  const yearlyTrees = Math.round(summary.environmental.treeEquivalent / 25);

  return (
    <section className="mt-12 sm:mt-16">
      <SectionHeader kicker={D["slide.environment.kicker"]} title={D["slide.environment.title"]} subtitle={D["slide.environment.subtitle"]} />
      <div ref={ref} className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0 }}
          className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 shadow-sm sm:p-5"
        >
          <Leaf className="h-6 w-6 text-emerald-600 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          <p className="mt-3 text-3xl font-bold text-emerald-900">{co2Count}<span className="text-base font-medium"> t</span></p>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-emerald-700">{D["env.co2"]}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-100/50 p-4 shadow-sm sm:p-5"
        >
          <TreeDeciduous className="h-6 w-6 text-emerald-600 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          <p className="mt-3 text-3xl font-bold text-emerald-900">{treeCount.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-emerald-700">{D["env.trees"]}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 to-sky-100/50 p-4 shadow-sm sm:p-5"
        >
          <Sun className="h-6 w-6 text-sky-600 drop-shadow-[0_0_8px_rgba(14,165,233,0.4)]" />
          <p className="mt-3 text-3xl font-bold text-sky-900">{genCount.toLocaleString("en-IN")}<span className="text-base font-medium"> u</span></p>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-sky-700">{D["env.solarYearly"]}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 to-violet-100/50 p-4 shadow-sm sm:p-5"
        >
          <Sparkles className="h-6 w-6 text-violet-600 drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
          <p className="mt-3 text-3xl font-bold text-violet-900">{summary.coverage}%</p>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-violet-700">{D["env.coverage"]}</p>
        </motion.div>
      </div>

      {/* Animated carbon offset highlight card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-6 text-white shadow-[0_8px_40px_rgba(16,185,129,0.25)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-emerald-300">Your 1-Year Carbon Offset</p>
            <p className="mt-3 text-2xl font-bold sm:text-3xl">
              Equivalent to planting{" "}
              <AnimatedNumber
                value={yearlyTrees}
                className="text-emerald-300"
              />{" "}
              trees 🌳
            </p>
            <p className="mt-2 text-sm text-emerald-200/80">
              Over 25 years — <span className="font-bold text-emerald-300">{summary.environmental.treeEquivalent.toLocaleString("en-IN")} trees</span> worth of CO₂ absorbed.
            </p>
          </div>
          <TreeDeciduous className="h-16 w-16 flex-shrink-0 text-emerald-400 opacity-30" />
        </div>
        <TreeAnimation count={Math.min(yearlyTrees, 40)} inView={inView} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-4 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white sm:p-10"
      >
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-emerald-300">{D["env.legacy.title"]}</p>
        <p className="mt-3 text-base text-slate-300 sm:text-lg">{D["env.legacy.sub"]}</p>
      </motion.div>
    </section>
  );
}

function CompanyProfileSection({
  D,
  summary,
  siteImages,
  installerLogoUrl
}: {
  D: ProposalDict;
  summary: ProposalDeckSummary;
  siteImages?: string[];
  installerLogoUrl?: string;
}) {
  const cp = summary.companyProfile;
  const heroImage = siteImages?.[0];
  const actionImage = siteImages?.[1];
  const expertiseCategories = [
    {
      icon: Home,
      title: "Residential Solar",
      subtitle: "Homes & Apartments",
      color: "sky",
      bullets: ["1–10 kW rooftop systems", "PM Surya Ghar subsidy eligible", "25-year performance warranty"],
      img: siteImages?.[2]
    },
    {
      icon: Building2,
      title: "Commercial Solar",
      subtitle: "Shops & Offices",
      color: "violet",
      bullets: ["10–100 kW on-grid systems", "Accelerated depreciation benefits", "Net metering + export income"],
      img: siteImages?.[3]
    },
    {
      icon: Factory,
      title: "Industrial Solar",
      subtitle: "Factories & Plants",
      color: "amber",
      bullets: ["100 kW+ ground/rooftop", "HT / LT connection solutions", "Custom energy audit + BOM"],
      img: siteImages?.[4]
    }
  ];

  return (
    <>
      {/* Page 1 — Identity */}
      <section className="mt-12 sm:mt-16">
        <SectionHeader kicker={D["slide.about.kicker"]} title={D["slide.about.title"]} />
        <div className="grid gap-4 sm:grid-cols-5">
          {/* About content */}
          <motion.div
            initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:col-span-3 sm:p-6"
          >
            {/* Company identity header */}
            <div className="flex items-center gap-3 mb-4">
              {installerLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={installerLogoUrl} alt={summary.installer} className="h-12 w-12 rounded-xl object-contain border border-slate-100 shadow-sm" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 shadow-md">
                  <Sun className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <p className="text-lg font-bold text-slate-900 leading-tight">{summary.installer}</p>
                <p className="text-xs text-slate-500">{summary.tagline}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-relaxed text-slate-700 sm:text-base">
              {cp.aboutUsParagraphs.map((p, i) => (<p key={i}>{p}</p>))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { l: D["about.founded"], v: cp.founded },
                { l: D["about.gst"], v: cp.gstNumber },
                { l: D["about.installations"], v: cp.installationsDone },
                { l: D["about.locations"], v: cp.locations }
              ].map((item, i) => (
                <motion.div
                  key={item.l}
                  initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                  className="rounded-xl bg-slate-50/80 p-3 border border-slate-100"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.l}</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{item.v}</p>
                </motion.div>
              ))}
            </div>
            <ul className="mt-5 space-y-2">
              {cp.bullets.map((b, i) => (
                <motion.li
                  key={b}
                  initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.2 + i * 0.05 }}
                  className="flex items-start gap-2 text-sm text-slate-700"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span>{b}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Action photo (floating right) */}
          <div className="flex flex-col gap-3 sm:col-span-2">
            {actionImage ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }} whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}
                className="relative overflow-hidden rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={actionImage} alt="Team in action" className="h-56 w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
              </motion.div>
            ) : (
              <div className="flex h-56 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                <span className="text-[11px] uppercase tracking-widest text-slate-400">Action Photo</span>
              </div>
            )}
            {/* Stats strip */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 text-center shadow-sm">
                <p className="text-2xl font-black text-emerald-900">{cp.installationsDone}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Installs</p>
              </div>
              <div className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 to-sky-100/50 p-4 text-center shadow-sm">
                <p className="text-2xl font-black text-sky-900">{cp.founded}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Est.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Wide-angle hero image — bottom bleed effect */}
        {heroImage ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative mt-5 overflow-hidden rounded-3xl shadow-[0_16px_60px_rgba(0,0,0,0.18)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt="Installation" className="h-52 w-full object-cover sm:h-72" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-6">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Excellence in Every Install</p>
              <p className="mt-1 text-lg font-bold text-white">{summary.installer}</p>
            </div>
          </motion.div>
        ) : null}
      </section>

      {/* Page 2 — Expertise Verticals */}
      <section className="mt-12 sm:mt-16">
        <SectionHeader
          kicker="Our Expertise"
          title="Solutions for Every Scale"
          subtitle="From home rooftops to industrial megawatts — we engineer the right system for you."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {expertiseCategories.map((cat, i) => {
            const colorMap: Record<string, string> = {
              sky: "border-sky-200/70 bg-gradient-to-br from-sky-50 to-white",
              violet: "border-violet-200/70 bg-gradient-to-br from-violet-50 to-white",
              amber: "border-amber-200/70 bg-gradient-to-br from-amber-50 to-white"
            };
            const iconMap: Record<string, string> = {
              sky: "bg-sky-500",
              violet: "bg-violet-500",
              amber: "bg-amber-500"
            };
            const textMap: Record<string, string> = {
              sky: "text-sky-900",
              violet: "text-violet-900",
              amber: "text-amber-900"
            };
            return (
              <motion.div
                key={cat.title}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                className={`overflow-hidden rounded-2xl border shadow-sm ${colorMap[cat.color]}`}
              >
                {cat.img ? (
                  <div className="relative h-36 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cat.img} alt={cat.title} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                ) : (
                  <div className={`flex h-36 items-center justify-center ${iconMap[cat.color]}`}>
                    <cat.icon className="h-16 w-16 text-white/30" />
                  </div>
                )}
                <div className="p-4">
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${iconMap[cat.color]} shadow-sm`}>
                    <cat.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className={`mt-2 text-base font-bold ${textMap[cat.color]}`}>{cat.title}</p>
                  <p className="text-[11px] font-semibold text-slate-500">{cat.subtitle}</p>
                  <ul className="mt-3 space-y-1.5">
                    {cat.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-1.5 text-xs text-slate-700">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-50" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function TechnicalProposalSection({ D, lang, summary }: { D: ProposalDict; lang: ProposalLang; summary: ProposalDeckSummary }) {
  const blocks = [
    { title: lang === "hi" ? "सोलर पैनल" : "Solar Panels", sub: `${summary.panels} × 540W ${summary.brands.panel}` },
    { title: lang === "hi" ? "DC केबल + DCDB" : "DC Cabling + DCDB", sub: "TUV 4mm² · SPD" },
    { title: lang === "hi" ? "ऑन-ग्रिड इन्वर्टर" : "On-Grid Inverter", sub: `${summary.systemKw} kW · MPPT` },
    { title: lang === "hi" ? "AC केबल + ACDB" : "AC Cabling + ACDB", sub: "MCB · Earthing" },
    { title: lang === "hi" ? "नेट मीटर" : "Net Meter", sub: lang === "hi" ? "द्विदिशीय" : "Bi-directional" },
    { title: lang === "hi" ? "MP ग्रिड / लोड" : "MP Grid / Load", sub: lang === "hi" ? "ऊर्जा निर्यात/आयात" : "Energy export/import" }
  ];
  const stages = lang === "hi"
    ? [
        { d: "दिन 1-2", t: "साइट सर्वे एवं डिज़ाइन", s: "छाया विश्लेषण, स्ट्रक्चरल जांच" },
        { d: "दिन 3-5", t: "DISCOM + ऑर्डर", s: "नेट-मीटर, सब्सिडी फॉर्म" },
        { d: "दिन 6-7", t: "स्ट्रक्चर इंस्टाल", s: "GI रेल्स, माउंटिंग" },
        { d: "दिन 7-9", t: "पैनल + इन्वर्टर", s: "DC/AC वायरिंग" },
        { d: "दिन 9-10", t: "टेस्टिंग + नेट मीटर", s: "कमीशनिंग + हैंडओवर" }
      ]
    : [
        { d: "Day 1-2", t: "Site Survey & Design", s: "Shadow + structural check" },
        { d: "Day 3-5", t: "DISCOM + Order", s: "Net-meter + subsidy filed" },
        { d: "Day 6-7", t: "Structure", s: "GI rails + mounting" },
        { d: "Day 7-9", t: "Panels + Inverter", s: "DC/AC wiring + earthing" },
        { d: "Day 9-10", t: "Testing + Net Meter", s: "Commissioning + handover" }
      ];

  return (
    <section className="mt-12 sm:mt-16">
      <SectionHeader kicker={D["slide.technical.kicker"]} title={D["slide.technical.title"]} />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{D["tech.architecture"]}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6 sm:gap-3">
          {blocks.map((b, i) => (
            <div key={i} className="rounded-xl border border-sky-200 bg-sky-50/40 p-3">
              <p className="text-xs font-bold text-slate-900">{b.title}</p>
              <p className="mt-1 text-[10px] text-slate-600">{b.sub}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{D["tech.projectPlan"]}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
          {stages.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">{i + 1}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.d}</span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-900">{s.t}</p>
              <p className="mt-1 text-[11px] text-slate-600">{s.s}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BomSection({ D, lang, summary }: { D: ProposalDict; lang: ProposalLang; summary: ProposalDeckSummary }) {
  return (
    <section className="mt-12 sm:mt-16">
      <SectionHeader kicker={D["slide.bom.kicker"]} title={D["slide.bom.title"]} />
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">#</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">{D["bom.component"]}</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">{D["bom.spec"]}</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">{D["bom.brand"]}</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">{D["bom.warranty"]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summary.bom.map((b, i) => (
              <tr key={b.slot} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                <td className="px-3 py-2 text-slate-500">{b.slot}</td>
                <td className="px-3 py-2 font-bold text-slate-900">{b.title}</td>
                <td className="px-3 py-2 text-slate-700">{b.spec}</td>
                <td className="px-3 py-2 text-slate-700">{b.brand}</td>
                <td className="px-3 py-2 font-medium text-emerald-700">{b.warranty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <ShieldCheck className="h-7 w-7 flex-shrink-0 text-emerald-600" />
          <div>
            <p className="text-base font-bold text-emerald-900">25 {D["amc.years"]} Panel Warranty</p>
            <p className="text-[11px] text-emerald-700">{lang === "hi" ? "पैनल पर 25 साल की वारंटी" : "Performance ≥ 80% at year 25"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <Zap className="h-7 w-7 flex-shrink-0 text-sky-600" />
          <div>
            <p className="text-base font-bold text-sky-900">10 {D["amc.years"]} Inverter Warranty</p>
            <p className="text-[11px] text-sky-700">{lang === "hi" ? "स्ट्रिंग इन्वर्टर, MPPT, IP65" : "String inverter, MPPT, IP65"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaymentSection({ D, summary }: { D: ProposalDict; summary: ProposalDeckSummary }) {
  const colors = ["bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500"];
  const labelKeys: Array<keyof ProposalDict> = ["pay.advance", "pay.material", "pay.installation", "pay.commissioning"];
  return (
    <section className="mt-12 sm:mt-16">
      <SectionHeader kicker={D["slide.payment.kicker"]} title={D["slide.payment.title"]} />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex h-12 w-full">
          {summary.paymentMilestones.map((m, i) => (
            <div
              key={m.step}
              className={`flex items-center justify-center text-base font-bold text-white ${colors[i]}`}
              style={{ width: `${m.pct}%` }}
            >
              {m.pct}%
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {summary.paymentMilestones.map((m, i) => (
            <div key={m.step} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${colors[i]}`}>{m.step}</span>
                <span className="text-base font-bold text-slate-900">{m.pct}%</span>
              </div>
              <p className="mt-2 text-xs font-bold text-slate-900">{D[labelKeys[i]]}</p>
              <p className="mt-1 text-base font-bold text-slate-900">{inr(m.amountInr)}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-white">
        <p className="text-sm">
          {D["commercial.gross"]}: <span className="font-bold">{inr(summary.grossSystemCost)}</span>
          {" · "}
          {D["commercial.subsidy"]}: <span className="font-bold text-emerald-300">−{inr(summary.pmSubsidy)}</span>
          {" · "}
          {D["commercial.net"]}: <span className="font-bold text-sky-300">{inr(summary.netCost)}</span>
        </p>
      </div>
    </section>
  );
}

function CommercialAndAmcSection({
  D,
  summary,
  selectedAmcYears,
  onAmcChange
}: {
  D: ProposalDict;
  summary: ProposalDeckSummary;
  selectedAmcYears: 1 | 5 | 10;
  onAmcChange: (y: 1 | 5 | 10) => void;
}) {
  return (
    <section className="mt-12 sm:mt-16">
      <SectionHeader kicker={D["slide.commercial.kicker"]} title={D["slide.commercial.title"]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{D["commercial.gross"]}</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-700">{D["commercial.gross"]}</span>
              <span className="text-base font-bold text-slate-900">{inr(summary.grossSystemCost)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-700">{D["commercial.subsidy"]}</span>
              <span className="text-base font-bold text-emerald-700">−{inr(summary.pmSubsidy)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-sky-50 p-2">
              <span className="text-sm font-bold text-sky-900">{D["commercial.net"]}</span>
              <span className="text-base font-bold text-sky-900">{inr(summary.netCost)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs italic text-emerald-700">✓ {D["commercial.gst"]}</p>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{D["slide.amc.kicker"]}</p>
          <div className="space-y-2">
            {summary.amcOptions.map((opt) => {
              const sel = opt.years === selectedAmcYears;
              return (
                <button
                  type="button"
                  key={opt.years}
                  onClick={() => onAmcChange(opt.years)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${sel ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-7 w-7 items-center justify-center rounded ${sel ? "bg-emerald-500" : "border-2 border-slate-300 bg-white"}`}>
                      {sel ? <CheckCircle2 className="h-5 w-5 text-white" /> : null}
                    </div>
                    <div>
                      <p className={`text-base font-bold ${sel ? "text-emerald-900" : "text-slate-900"}`}>
                        {opt.years} {opt.years === 1 ? D["amc.year"] : D["amc.years"]} {D["amc.option"]}
                      </p>
                      <p className="text-[11px] text-slate-600">{opt.highlights.slice(0, 2).join(" · ")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-bold ${opt.free ? "text-emerald-700" : sel ? "text-emerald-900" : "text-slate-900"}`}>
                      {opt.free ? "FREE" : inr(opt.totalInr)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ServiceAmcSection({ D, lang, summary }: { D: ProposalDict; lang: ProposalLang; summary: ProposalDeckSummary }) {
  const includedBullets = lang === "hi"
    ? ["त्रैमासिक पैनल सफाई + विद्युत जांच", "इन्वर्टर पैरामीटर मॉनिटरिंग", "DC/AC वायरिंग सत्यापन", "अर्थिंग एवं SPD जांच", "जनरेशन रिपोर्ट हर तिमाही"]
    : ["Quarterly panel cleaning + electrical check", "Inverter parameter monitoring", "DC/AC wiring verification", "Earthing & SPD test", "Quarterly generation report"];
  const excludedBullets = lang === "hi"
    ? ["साइट पर पानी एवं विद्युत आपूर्ति", "बीमा एवं भौतिक नुकसान", "इंटरनेट कनेक्शन", "वैंडालिज्म से क्षति"]
    : ["Water + power at the site", "Insurance & physical damage", "Internet connectivity", "Vandalism damage"];
  return (
    <section className="mt-12 sm:mt-16">
      <SectionHeader kicker={D["slide.amc.kicker"]} title={D["slide.amc.title"]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            <p className="text-base font-bold text-emerald-900">{D["amc.included"]}</p>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {includedBullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-rose-700" />
            <p className="text-base font-bold text-rose-900">{D["amc.excluded"]}</p>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {excludedBullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <Gauge className="h-7 w-7 flex-shrink-0 text-sky-600" />
          <div>
            <p className="text-sm font-bold text-sky-900">{D["amc.response"]}</p>
            <p className="text-[11px] text-sky-700">
              {lang === "hi" ? "ब्रेकडाउन कॉल पर 24-48 घंटे में" : "On-site response within 24-48 hrs"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <Phone className="h-7 w-7 flex-shrink-0 text-violet-600" />
          <div>
            <p className="text-sm font-bold text-violet-900">{D["amc.escalation"]}</p>
            <p className="text-[11px] text-violet-700">{summary.contact}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BankingSection({
  D,
  summary,
  siteImages,
  proposalId,
  lang
}: {
  D: ProposalDict;
  summary: ProposalDeckSummary;
  siteImages?: string[];
  proposalId: string;
  lang: ProposalLang;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  // QR target priority: UPI link → public web proposal URL → none.
  // We compute the web URL lazily on the client (window.origin) so SSR works.
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  useEffect(() => {
    if (summary.upiLink) {
      setQrPayload(summary.upiLink);
      return;
    }
    if (typeof window !== "undefined") {
      setQrPayload(`${window.location.origin}/proposal/${proposalId}`);
    }
  }, [summary.upiLink, proposalId]);
  useEffect(() => {
    if (!qrPayload) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const QR = (await import("qrcode")).default;
        const dataUrl = await QR.toDataURL(qrPayload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 600,
          color: { dark: "#0B132B", light: "#FFFFFF" }
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    })();
    return () => { cancelled = true; };
  }, [qrPayload]);

  const bnk = summary.bankDetails;
  const rows = [
    { l: D["bank.accountName"], v: bnk.accountName ?? summary.installer },
    { l: D["bank.accountNumber"], v: bnk.accountNumber ?? "—" },
    { l: D["bank.ifsc"], v: bnk.ifsc ?? "—" },
    { l: D["bank.branch"], v: bnk.branch ?? "—" },
    { l: D["bank.upiId"], v: bnk.upiId ?? "—" }
  ];

  // Priority: uploaded payment QR > site photo gallery > auto-generated UPI/web QR
  const uploadedQr = bnk.paymentQrCodeUrl?.trim();
  const photos = (siteImages ?? []).filter((u) => typeof u === "string" && u.length > 0).slice(0, 6);
  const showGallery = !uploadedQr && photos.length > 0;
  const galleryTitle = lang === "hi" ? "हमारे संस्थापन" : "Recent Installations";
  const qrCaption = uploadedQr
    ? (lang === "hi" ? "भुगतान QR कोड" : "Payment QR Code")
    : summary.upiLink
      ? D["bank.scanQr"]
      : (lang === "hi" ? "वेब प्रपोजल देखने के लिए स्कैन करें" : "Scan to view this proposal online");

  return (
    <section className="mt-12 sm:mt-16">
      <SectionHeader kicker={D["slide.banking.kicker"]} title={D["slide.banking.title"]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-6">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-slate-700" />
            <p className="text-sm font-bold text-slate-900">Bank Transfer</p>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {rows.map((r) => (
              <div key={r.l} className="flex items-center justify-between py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{r.l}</span>
                <span className="text-sm font-bold text-slate-900">{r.v}</span>
              </div>
            ))}
          </div>
        </div>
        {showGallery ? (
          <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">{galleryTitle}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {lang === "hi" ? "हमारी हाल की कुछ इंस्टॉलेशन।" : "A few of our recent rooftop installations."}
            </p>
            <div className={`mt-4 grid gap-2 ${photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
              {photos.map((url, i) => (
                <div key={i} className="aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Site ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-6"
          >
            <p className="text-sm font-bold text-slate-900">{qrCaption}</p>
            <div className="mt-4 flex h-60 w-60 items-center justify-center rounded-2xl bg-slate-50 p-2 shadow-inner">
              {uploadedQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={uploadedQr}
                  alt="Payment QR"
                  className="h-56 w-56 rounded-xl object-contain"
                />
              ) : qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt={summary.upiLink ? "UPI QR" : "Web proposal QR"} className="h-52 w-52" />
              ) : (
                <span className="text-xs text-slate-400">
                  {qrPayload ? "Generating QR…" : "QR not available"}
                </span>
              )}
            </div>
            {bnk.upiId ? (
              <p className="mt-3 text-xs italic text-slate-500">{bnk.upiId}</p>
            ) : null}
            {uploadedQr && (
              <p className="mt-2 text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                Scan to Pay · High-resolution
              </p>
            )}
          </motion.div>
        )}
      </div>
      <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-800">
        🔒 GST receipt issued · RTGS / NEFT / UPI accepted
      </p>
    </section>
  );
}

function ClosingSection({
  D,
  summary,
  siteImages,
  onShare,
  onDownload,
  installer,
  downloading
}: {
  D: ProposalDict;
  summary: ProposalDeckSummary;
  siteImages?: string[];
  onShare: () => void;
  onDownload: () => void;
  installer: { name: string; contact: string; tagline: string };
  downloading: boolean;
}) {
  return (
    <section className="mt-12 sm:mt-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white sm:p-10"
      >
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-sky-300">{D["common.thankYou"]}</p>
        <h3 className="mt-3 text-3xl font-bold sm:text-5xl">{summary.honoredName}!</h3>
        <p className="mt-3 text-base text-slate-300 sm:text-lg">{D["slide.closing.title"]}</p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[3, 4, 5].map((i, idx) => {
            const url = siteImages?.[i] ?? siteImages?.[idx];
            return (
              <div key={idx} className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-700">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={`Site ${idx + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <span className="text-[10px] uppercase tracking-widest">Photo</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <CtaButton onClick={onShare} variant="secondary">
            <MessageCircle className="h-4 w-4" /> {D["cta.whatsapp"]}
          </CtaButton>
          <CtaButton onClick={onDownload} variant="ghost">
            <Download className="h-4 w-4" />
            {downloading ? "…" : D["cta.downloadPpt"]}
          </CtaButton>
          <CtaButton href={`tel:${installer.contact.replace(/[^\d+]/g, "")}`} variant="ghost">
            <Phone className="h-4 w-4" /> {D["cta.callUs"]}
          </CtaButton>
        </div>
      </motion.div>
      <p className="mt-8 text-center text-[11px] uppercase tracking-[0.24em] text-slate-400">
        {installer.name} · {installer.contact} · {installer.tagline}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main page-level component
// ---------------------------------------------------------------------------

export default function ProposalView({
  id,
  customerName,
  summary,
  installer,
  siteImages,
  installerLogoUrl
}: ProposalViewProps) {
  const [downloading, setDownloading] = useState(false);
  const [lang, setLang] = useState<ProposalLang>(summary.lang ?? "en");
  const [selectedAmcYears, setSelectedAmcYears] = useState<1 | 5 | 10>(summary.amcSelectedYears ?? 5);
  const [darkMode, setDarkMode] = useState(false);

  const D = dict(lang);
  const monthLbls = monthLabels(lang);

  const whatsappText = useMemo(() => {
    const link = typeof window !== "undefined" ? `${window.location.origin}/proposal/${id}` : `/proposal/${id}`;
    return [
      `Namaste ${summary.honoredName} 🌞`,
      ``,
      `${summary.systemKw} kW solar proposal aapke liye taiyaar hai:`,
      `• Net cost: ${inr(summary.netCost)} (after PM Surya Ghar subsidy ${inr(summary.pmSubsidy)})`,
      `• Annual saving: ${inr(summary.annualSaving)}`,
      `• Payback: ${summary.paybackYears.toFixed(1)} yr`,
      `• 25-yr saving: ${inr(summary.solarVsGrid.netSaving)}`,
      ``,
      `Full interactive proposal: ${link}`,
      ``,
      `— ${installer.name}`
    ].join("\n");
  }, [id, summary, installer.name]);

  async function downloadPpt() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/proposals/${id}/ppt?lang=${lang}`, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${customerName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "customer"}-proposal.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("PPT download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  function shareWhatsApp() {
    if (typeof window === "undefined") return;
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Each section is wrapped in a `.proposal-page` block so it prints to its own
  // A4 page (`page-break-after: always` in @media print). On desktop the whole
  // document is constrained to A4 width (`max-w-[210mm]`) for a real "document"
  // feel; on mobile the sections stack vertically full-bleed.
  return (
    <div
      className={`proposal-document mx-auto w-full max-w-[210mm] px-4 pb-32 pt-6 sm:px-8 sm:pt-10 print:max-w-none print:p-0 print:pb-0 transition-colors duration-300 ${
        darkMode ? "bg-slate-950 text-white" : "bg-transparent"
      }`}
      data-theme={darkMode ? "dark" : "light"}
    >
      {/* Floating controls — hidden in print */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setLang((l) => (l === "en" ? "hi" : "en"))}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
            darkMode
              ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Languages className="h-3.5 w-3.5" />
          {lang === "en" ? "हिन्दी" : "English"}
        </button>
        <button
          type="button"
          onClick={() => setDarkMode((d) => !d)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
            darkMode
              ? "border-yellow-500/50 bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/60"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {darkMode ? "Light" : "Dark"}
        </button>
        <button
          type="button"
          onClick={() => { if (typeof window !== "undefined") window.print(); }}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
            darkMode
              ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Download className="h-3.5 w-3.5" />
          {lang === "en" ? "Print / PDF" : "प्रिंट / PDF"}
        </button>
      </div>

      <div className="proposal-page">
        <HeroCover D={D} summary={summary} installerLogoUrl={installerLogoUrl} location={undefined} />
      </div>

      <div className="proposal-page">
        <DeepAuditSection D={D} summary={summary} monthLbls={monthLbls} />
      </div>

      <div className="proposal-page">
        <EconomicsSection D={D} summary={summary} monthLbls={monthLbls} />
      </div>

      <div className="proposal-page">
        <EnvironmentSection D={D} summary={summary} />
      </div>

      <div className="proposal-page">
        <CompanyProfileSection D={D} summary={summary} siteImages={siteImages} installerLogoUrl={installerLogoUrl} />
      </div>

      <div className="proposal-page">
        <TechnicalProposalSection D={D} lang={lang} summary={summary} />
      </div>

      <div className="proposal-page">
        <BomSection D={D} lang={lang} summary={summary} />
      </div>

      <div className="proposal-page">
        <PaymentSection D={D} summary={summary} />
      </div>

      <div className="proposal-page">
        <CommercialAndAmcSection D={D} summary={summary} selectedAmcYears={selectedAmcYears} onAmcChange={setSelectedAmcYears} />
      </div>

      <div className="proposal-page">
        <ServiceAmcSection D={D} lang={lang} summary={summary} />
      </div>

      <div className="proposal-page">
        <BankingSection D={D} summary={summary} siteImages={siteImages} proposalId={id} lang={lang} />
      </div>

      <div className="proposal-page">
        <ClosingSection
          D={D}
          summary={summary}
          siteImages={siteImages}
          onShare={shareWhatsApp}
          onDownload={downloadPpt}
          installer={installer}
          downloading={downloading}
        />
      </div>

      {/* Sticky bottom action bar — mobile only, hidden in print */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow active:scale-95"
          >
            <MessageCircle className="h-4 w-4" /> {D["cta.whatsapp"]}
          </button>
          <button
            type="button"
            onClick={downloadPpt}
            disabled={downloading}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm active:scale-95"
          >
            <Download className="h-4 w-4" /> {downloading ? "…" : D["cta.downloadPpt"]}
          </button>
        </div>
      </div>
    </div>
  );
}
