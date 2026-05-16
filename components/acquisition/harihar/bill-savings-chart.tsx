"use client";

import { motion } from "framer-motion";

type Props = {
  currentBill: number;
  newBill: number;
  monthlySavings: number;
};

/** Premium glass bar comparison — bill before vs after solar (API-driven). */
export function BillSavingsChart({ currentBill, newBill, monthlySavings }: Props) {
  const max = Math.max(currentBill, newBill, 1);
  const curW = Math.min(100, (currentBill / max) * 100);
  const newW = Math.min(100, (newBill / max) * 100);
  const savW = Math.min(100, (monthlySavings / max) * 100);

  return (
    <div className="space-y-5">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Monthly bill model
      </p>
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Current (model)</span>
            <span className="font-mono text-slate-200">₹{currentBill.toLocaleString("en-IN")}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-rose-500/90 to-orange-500/80"
              initial={{ width: 0 }}
              animate={{ width: `${curW}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>After solar (model)</span>
            <span className="font-mono text-emerald-200">₹{newBill.toLocaleString("en-IN")}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600/90 to-teal-400/80"
              initial={{ width: 0 }}
              animate={{ width: `${newW}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.08 }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Estimated monthly savings</span>
            <span className="font-mono text-amber-100">₹{monthlySavings.toLocaleString("en-IN")}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500/95 to-amber-300/75"
              initial={{ width: 0 }}
              animate={{ width: `${savW}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.16 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type SparkProps = {
  /** 25 yearly points: could be cumulative savings steps; here linear ramp from API 25y total for visual rhythm. */
  annualSavings: number;
};

/** Stylised 25-year cumulative savings curve (derived from API totals, not fake monthly data). */
export function TwentyFiveYearSpark({ annualSavings }: SparkProps) {
  const total = Math.max(0, annualSavings * 25);
  const points: string[] = [];
  const n = 25;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 100;
    const frac = i / n;
    const y = 100 - Math.pow(frac, 1.35) * 85 - 8;
    points.push(`${x},${y}`);
  }
  const d = `M 0,100 L ${points.join(" L ")} L 100,100 Z`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        25-year savings trajectory (model)
      </p>
      <svg viewBox="0 0 100 100" className="aspect-[2/1] w-full" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16,185,129)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="rgb(15,23,42)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sparkLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <path d={d} fill="url(#sparkFill)" />
        <motion.polyline
          fill="none"
          stroke="url(#sparkLine)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points.join(" ")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <p className="mt-1 text-center font-mono text-xs text-emerald-100/90">
        ≈ ₹{Math.round(total).toLocaleString("en-IN")} cumulative (25 × annual model)
      </p>
    </div>
  );
}
