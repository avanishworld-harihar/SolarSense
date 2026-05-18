"use client";

/**
 * BlockROIDashboard — Investment return overview for commercial proposals.
 *
 * Premium visual treatment:
 *   - 4 giant animated KPI tiles (count-up on viewport entry)
 *   - Animated cumulative cashflow bar chart with spring transitions
 *   - 25-year grid vs solar lifecycle cost comparison bars
 *   - Environmental ROI card with CO₂ and tree metrics
 */

import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Clock, Leaf } from "lucide-react";
import type { CommercialCtx } from "@/components/proposal/commercial-proposal-view";
import {
  CommercialSectionHeader,
  CountUp,
  GlassPanel,
  KpiCard,
  SectionReveal,
} from "./commercial-shared";

const fmtL = (v: number) => {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)} k`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};

type Props = { ctx: CommercialCtx };

export function BlockROIDashboard({ ctx }: Props) {
  const { summary, roiPct, irr, cashflow25, breakEvenYear, profit25, lang } = ctx;
  const isHi = lang === "hi";

  const kpis = [
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: isHi ? "प्रथम वर्ष ROI" : "First-Year ROI",
      rawValue: roiPct,
      suffix: "%",
      decimals: 1,
      sub: isHi ? "प्रारंभिक रिटर्न" : "initial yield on investment",
      accent: "emerald" as const,
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: isHi ? "अनुमानित IRR" : "Estimated IRR",
      rawValue: irr,
      suffix: "%",
      decimals: 1,
      sub: isHi ? "आंतरिक रिटर्न दर" : "internal rate of return",
      accent: "sky" as const,
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: isHi ? "ब्रेक-ईवन वर्ष" : "Break-Even Year",
      rawValue: breakEvenYear,
      suffix: "",
      decimals: 0,
      sub: isHi ? "कुल पुनर्प्राप्ति" : "full investment recovery",
      accent: "indigo" as const,
    },
    {
      icon: <Leaf className="h-4 w-4" />,
      label: isHi ? "25 वर्ष शुद्ध लाभ" : "25-Year Net Profit",
      rawValue: null,
      displayValue: fmtL(profit25),
      suffix: "",
      decimals: 0,
      sub: isHi ? "6% टैरिफ वृद्धि पर" : "at 6% tariff escalation p.a.",
      accent: "violet" as const,
    },
  ];

  // Break-even chart: every 2 years
  const chartRows = cashflow25.filter((_, i) => i % 2 === 0);
  const maxAbs = Math.max(summary.netCost, Math.abs(profit25), 1);
  const ZERO_PCT = (summary.netCost / maxAbs) * 100;

  // Grid vs Solar
  const gridCost = summary.solarVsGrid.totalGrid;
  const solarCost = summary.solarVsGrid.totalSolar;
  const maxCost = Math.max(gridCost, solarCost, 1);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:px-12 md:py-24">
      <CommercialSectionHeader
        num="02"
        label={isHi ? "निवेश पर रिटर्न" : "Return on Investment"}
        title={isHi ? "निवेश विश्लेषण डैशबोर्ड" : "Investment Analysis Dashboard"}
        subtitle={
          isHi
            ? "₹ के प्रत्येक रुपये का वापसी समय और कुल लाभ"
            : "Full financial return profile — payback, IRR, and 25-year wealth creation"
        }
      />

      {/* KPI tiles — giant animated numbers */}
      <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            icon={kpi.icon}
            label={kpi.label}
            value={
              kpi.rawValue !== null ? (
                <CountUp
                  target={kpi.rawValue}
                  suffix={kpi.suffix}
                  decimals={kpi.decimals}
                />
              ) : (
                kpi.displayValue
              )
            }
            sub={kpi.sub}
            accent={kpi.accent}
            delay={i * 0.08}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Break-even chart — 3 columns */}
        <SectionReveal className="lg:col-span-3" delay={0.05}>
          <GlassPanel className="p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {isHi ? "संचयी नकद प्रवाह (25 वर्ष)" : "Cumulative Cashflow — 25 Years"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {isHi ? "ब्रेक-ईवन बिंदु: वर्ष" : "Break-even at Year"}{" "}
                  <span className="text-emerald-600">{breakEvenYear}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-400" />
                  {isHi ? "नकारात्मक" : "Loss"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  {isHi ? "सकारात्मक" : "Profit"}
                </span>
              </div>
            </div>

            {/* Bar chart */}
            <div className="relative">
              <div
                className="absolute inset-x-0 border-b-2 border-dashed border-slate-200"
                style={{ top: `${ZERO_PCT}%` }}
              >
                <span className="absolute -top-4 right-0 text-[9px] font-semibold text-slate-400">₹0</span>
              </div>

              <div className="flex h-56 items-end gap-0.5 sm:gap-1">
                {chartRows.map((row, i) => {
                  const isPos = row.cumulative >= 0;
                  const h = Math.min((Math.abs(row.cumulative) / maxAbs) * 100, 100);
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
                            transition={{ delay: i * 0.035, type: "spring", stiffness: 80, damping: 16 }}
                            className="w-full rounded-t bg-gradient-to-t from-emerald-700 to-emerald-400"
                          />
                        ) : (
                          <motion.div
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.035, type: "spring", stiffness: 80, damping: 16 }}
                            className="mt-auto w-full rounded-b bg-gradient-to-b from-rose-400 to-rose-600"
                          />
                        )}
                      </div>
                      <span className="mt-1.5 text-[9px] font-medium text-slate-400">{row.year}</span>
                      {/* Hover tooltip */}
                      <div className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-xl group-hover:block whitespace-nowrap">
                        {row.cumulative >= 0 ? "+" : ""}
                        {fmtL(row.cumulative)}
                        <span className="ml-1 text-slate-400">yr {row.year}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-right text-[10px] font-medium text-slate-400">
                {isHi ? "वर्ष →" : "Year →"}
              </p>
            </div>
          </GlassPanel>
        </SectionReveal>

        {/* Right column — 2 columns */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Grid vs Solar lifecycle */}
          <SectionReveal delay={0.12}>
            <GlassPanel className="p-6">
              <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {isHi ? "25 वर्ष ऊर्जा लागत तुलना" : "25-Year Energy Cost Comparison"}
              </p>

              <div className="space-y-5">
                {[
                  {
                    label: isHi ? "ग्रिड ऊर्जा (6% p.a.)" : "Grid Energy Cost",
                    value: gridCost,
                    barClass: "bg-gradient-to-r from-rose-500 to-rose-400",
                    textClass: "text-rose-700",
                  },
                  {
                    label: isHi ? "सौर + बकाया ग्रिड" : "Solar + Residual Grid",
                    value: solarCost,
                    barClass: "bg-gradient-to-r from-sky-500 to-sky-400",
                    textClass: "text-sky-700",
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-[11px] font-medium text-slate-600">{item.label}</span>
                      <span className={`text-sm font-black tabular-nums ${item.textClass}`}>
                        {fmtL(item.value)}
                      </span>
                    </div>
                    <div className="h-3.5 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(item.value / maxCost) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className={`h-full rounded-full ${item.barClass}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Net saving callout */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="mt-5 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600">
                  {isHi ? "कुल बचत" : "Net Lifecycle Saving"}
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums text-emerald-800">
                  {fmtL(summary.solarVsGrid.netSaving)}
                </p>
                <p className="mt-0.5 text-[10px] text-emerald-600">
                  {isHi ? "25 वर्ष में ग्रिड बनाम सौर" : "grid vs solar over 25 years"}
                </p>
              </motion.div>
            </GlassPanel>
          </SectionReveal>

          {/* Environmental ROI */}
          <SectionReveal delay={0.2}>
            <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-6">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                {isHi ? "पर्यावरण ROI" : "Environmental ROI"}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  {
                    label: isHi ? "CO₂ बचत/वर्ष" : "CO₂ Avoided/yr",
                    value: (summary.environmental.annualCo2KgSaved / 1000).toFixed(1),
                    unit: "T",
                  },
                  {
                    label: isHi ? "पेड़ समतुल्य" : "Tree Equivalent",
                    value: String(summary.environmental.treeEquivalent),
                    unit: "",
                  },
                  {
                    label: isHi ? "25yr CO₂" : "25yr CO₂",
                    value: String(summary.environmental.lifetimeCo2TonsSaved),
                    unit: "T",
                  },
                ].map((e) => (
                  <div key={e.label} className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-black tabular-nums text-emerald-800">
                      {e.value}
                      <span className="text-sm font-bold text-emerald-600">{e.unit}</span>
                    </span>
                    <span className="text-[9px] font-semibold text-emerald-600">{e.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionReveal>
        </div>
      </div>
    </div>
  );
}
