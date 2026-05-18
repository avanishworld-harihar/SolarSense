"use client";

/**
 * BlockROIDashboard — Investment return overview for commercial proposals.
 *
 * Shows the full investment story on one screen:
 *   - 4 primary KPI tiles (Annual ROI, IRR, Payback, 25yr Profit)
 *   - Break-even trajectory chart (cumulative cashflow over 25 years)
 *   - Grid energy cost vs solar lifecycle cost comparison
 *   - Annual carbon avoided (environmental ROI)
 */

import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Clock, Leaf } from "lucide-react";
import type { CommercialCtx } from "@/components/proposal/commercial-proposal-view";

const fmtL = (v: number) => {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)} k`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};

type Props = { ctx: CommercialCtx };

function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{num}</span>
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-600">{label}</span>
    </div>
  );
}

export function BlockROIDashboard({ ctx }: Props) {
  const { summary, roiPct, irr, cashflow25, breakEvenYear, profit25, lang } = ctx;
  const isHi = lang === "hi";

  const kpis = [
    {
      icon: TrendingUp,
      label: isHi ? "प्रथम वर्ष ROI" : "First-Year ROI",
      value: `${roiPct}%`,
      sub: isHi ? "प्रारंभिक रिटर्न" : "initial yield on investment",
      accent: "emerald",
    },
    {
      icon: DollarSign,
      label: isHi ? "अनुमानित IRR" : "Estimated IRR",
      value: `${irr}%`,
      sub: isHi ? "आंतरिक रिटर्न दर" : "internal rate of return",
      accent: "sky",
    },
    {
      icon: Clock,
      label: isHi ? "ब्रेक-ईवन वर्ष" : "Break-Even Year",
      value: `${breakEvenYear}`,
      sub: isHi ? "कुल पुनर्प्राप्ति" : "full investment recovery",
      accent: "indigo",
    },
    {
      icon: Leaf,
      label: isHi ? "25 वर्ष शुद्ध लाभ" : "25-Year Net Profit",
      value: fmtL(profit25),
      sub: isHi ? "6% टैरिफ वृद्धि पर" : "at 6% p.a. tariff escalation",
      accent: "violet",
    },
  ];

  const accentClasses: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: "text-emerald-500",
    },
    sky: {
      bg: "bg-sky-50",
      text: "text-sky-700",
      border: "border-sky-200",
      icon: "text-sky-500",
    },
    indigo: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      border: "border-indigo-200",
      icon: "text-indigo-500",
    },
    violet: {
      bg: "bg-violet-50",
      text: "text-violet-700",
      border: "border-violet-200",
      icon: "text-violet-500",
    },
  };

  // Break-even chart: cumulative cashflow, every 2 years for chart
  const chartRows = cashflow25.filter((_, i) => i % 2 === 0);
  const maxAbs = Math.max(summary.netCost, Math.abs(profit25), 1);
  const ZERO_LINE_PCT = (summary.netCost / maxAbs) * 100; // where the zero line sits in the neg zone

  // Grid vs Solar 25yr cost
  const gridLifetimeCost = summary.solarVsGrid.totalGrid;
  const solarLifetimeCost = summary.solarVsGrid.totalSolar;
  const maxCost = Math.max(gridLifetimeCost, solarLifetimeCost, 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <SectionLabel num="02" label={isHi ? "निवेश पर रिटर्न" : "Return on Investment"} />

      <div className="mb-3">
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
          {isHi ? "निवेश विश्लेषण डैशबोर्ड" : "Investment Analysis Dashboard"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isHi
            ? "₹ के प्रत्येक रुपये का वापसी समय और कुल लाभ"
            : "Full financial return profile — payback, IRR, and 25-year wealth creation"}
        </p>
      </div>

      {/* KPI tiles */}
      <div className="mb-8 mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi, i) => {
          const ac = accentClasses[kpi.accent];
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className={`rounded-xl border p-5 ${ac.bg} ${ac.border}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${ac.icon}`} />
                <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${ac.text} opacity-70`}>
                  {kpi.label}
                </span>
              </div>
              <div className={`text-3xl font-bold tabular-nums ${ac.text}`}>{kpi.value}</div>
              <p className="mt-1 text-[10px] text-slate-500">{kpi.sub}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Break-even chart — 3/5 columns */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  {isHi ? "संचयी नकद प्रवाह (25 वर्ष)" : "Cumulative Cashflow — 25 Years"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isHi ? "ब्रेक-ईवन बिंदु: वर्ष" : "Break-even at Year"} {breakEvenYear}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-rose-400" />
                  {isHi ? "नकारात्मक" : "Negative"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
                  {isHi ? "सकारात्मक" : "Positive"}
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="relative">
              {/* Zero reference line */}
              <div
                className="absolute inset-x-0 border-b-2 border-dashed border-slate-300"
                style={{ top: `${ZERO_LINE_PCT}%` }}
              >
                <span className="absolute right-0 -top-4 text-[9px] text-slate-400">₹0</span>
              </div>

              <div className="flex h-52 items-end gap-1">
                {chartRows.map((row, i) => {
                  const isPos = row.cumulative >= 0;
                  const h = Math.min(Math.abs(row.cumulative / maxAbs) * 100, 100);
                  return (
                    <div
                      key={row.year}
                      className="group relative flex flex-1 flex-col items-center"
                      style={{ height: "100%" }}
                    >
                      <div className="relative flex h-full w-full flex-col items-center justify-end">
                        {isPos ? (
                          <motion.div
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.03, type: "spring", stiffness: 90 }}
                            className="w-full rounded-t-sm bg-gradient-to-t from-emerald-600 to-emerald-400"
                          />
                        ) : (
                          <motion.div
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.03, type: "spring", stiffness: 90 }}
                            className="mt-auto w-full rounded-b-sm bg-gradient-to-b from-rose-400 to-rose-600"
                          />
                        )}
                      </div>
                      <span className="mt-1 text-[9px] text-slate-400">{row.year}</span>
                      {/* Tooltip on hover */}
                      <div className="pointer-events-none absolute -top-8 z-10 hidden rounded bg-slate-800 px-2 py-1 text-[10px] text-white group-hover:block">
                        {row.cumulative >= 0 ? "+" : ""}
                        {fmtL(row.cumulative)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-right text-[10px] text-slate-400">
                {isHi ? "वर्ष →" : "Year →"}
              </p>
            </div>
          </div>
        </div>

        {/* Right column — 2/5 columns */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Grid vs Solar comparison */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              {isHi ? "25 वर्ष ऊर्जा लागत तुलना" : "25-Year Energy Cost Comparison"}
            </p>

            <div className="space-y-4">
              {[
                {
                  label: isHi ? "ग्रिड ऊर्जा (₹/yr escalating)" : "Grid Energy Cost",
                  value: gridLifetimeCost,
                  color: "bg-rose-500",
                  textColor: "text-rose-700",
                },
                {
                  label: isHi ? "सौर + बकाया ग्रिड" : "Solar + Residual Grid",
                  value: solarLifetimeCost,
                  color: "bg-sky-500",
                  textColor: "text-sky-700",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-xs text-slate-600">{item.label}</span>
                    <span className={`text-sm font-bold tabular-nums ${item.textColor}`}>
                      {fmtL(item.value)}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(item.value / maxCost) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7 }}
                      className={`h-full rounded-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg bg-emerald-50 p-3">
              <p className="text-[10px] font-bold text-emerald-700">
                {isHi ? "कुल बचत" : "Net Lifecycle Saving"}
              </p>
              <p className="text-lg font-bold tabular-nums text-emerald-800">
                {fmtL(summary.solarVsGrid.netSaving)}
              </p>
              <p className="text-[10px] text-emerald-600">
                {isHi ? "25 वर्ष में ग्रिड बनाम सौर" : "grid vs solar over 25 years"}
              </p>
            </div>
          </div>

          {/* Environmental ROI */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600">
              {isHi ? "पर्यावरण ROI" : "Environmental ROI"}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                {
                  label: isHi ? "CO₂ बचत/वर्ष" : "CO₂ Avoided/yr",
                  value: `${(summary.environmental.annualCo2KgSaved / 1000).toFixed(1)} T`,
                },
                {
                  label: isHi ? "पेड़ समतुल्य" : "Tree Equivalent",
                  value: `${summary.environmental.treeEquivalent}`,
                },
                {
                  label: isHi ? "25yr CO₂" : "25yr CO₂",
                  value: `${summary.environmental.lifetimeCo2TonsSaved} T`,
                },
              ].map((e) => (
                <div key={e.label} className="flex flex-col gap-0.5">
                  <span className="text-base font-bold tabular-nums text-emerald-800">{e.value}</span>
                  <span className="text-[9px] text-emerald-600">{e.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
