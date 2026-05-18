"use client";

/**
 * BlockCommercialFinancials — premium financial intelligence for commercial proposals.
 *
 * Visual treatment:
 *   - 4 large metric cards: ROI, IRR, LCOE, NPV — with CountUp on ROI/IRR
 *   - Premium data table with milestone rows highlighted
 *   - Cumulative profit bar chart (spring animated)
 *   - Break-even summary callout
 */

import { motion } from "framer-motion";
import { BarChart2, CheckCircle2, TrendingUp } from "lucide-react";
import type { CommercialCtx } from "@/components/proposal/commercial-proposal-view";
import {
  CommercialSectionHeader,
  CountUp,
  GlassPanel,
  KpiCard,
  SectionReveal,
} from "./commercial-shared";

const fmtL = (v: number, abs = false) => {
  const val = abs ? Math.abs(v) : v;
  if (Math.abs(val) >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100_000) return `₹${(val / 100_000).toFixed(1)} L`;
  if (Math.abs(val) >= 1_000) return `₹${(val / 1_000).toFixed(0)} k`;
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
};

type Props = { ctx: CommercialCtx };

export function BlockCommercialFinancials({ ctx }: Props) {
  const { summary, roiPct, irr, cashflow25, breakEvenYear, profit25, lcoe, lang } = ctx;
  const isHi = lang === "hi";

  // NPV at 10% discount rate
  const DISCOUNT_RATE = 0.1;
  const npv = cashflow25.reduce(
    (acc, row) => acc + row.saving / Math.pow(1 + DISCOUNT_RATE, row.year),
    -summary.netCost
  );

  const keyMetrics = [
    {
      label: isHi ? "प्रथम वर्ष ROI" : "First-Year ROI",
      value: <CountUp target={roiPct} suffix="%" decimals={1} />,
      note: isHi ? "वार्षिक" : "annualised",
      accent: "emerald" as const,
    },
    {
      label: isHi ? "अनुमानित IRR" : "Estimated IRR",
      value: <CountUp target={irr} suffix="%" decimals={1} />,
      note: isHi ? "Rule of 72 आधार" : "Rule-of-72 basis",
      accent: "sky" as const,
    },
    {
      label: "LCOE",
      value: `₹${lcoe}/kWh`,
      note: isHi ? "25 वर्ष लागत" : "levelised cost of energy",
      accent: "indigo" as const,
    },
    {
      label: isHi ? "NPV (10%)" : "NPV (@ 10%)",
      value: fmtL(npv),
      note: npv > 0 ? (isHi ? "सकारात्मक" : "positive") : (isHi ? "नकारात्मक" : "negative"),
      accent: npv > 0 ? ("violet" as const) : ("rose" as const),
    },
  ];

  // Display years
  const displayYears = [1, 2, 3, 4, 5, 10, 15, 20, 25];
  const displayRows = cashflow25.filter((r) => displayYears.includes(r.year));

  // Grid cost per year
  const gridCostByYear: number[] = [];
  let gridCost = summary.yearlyBill;
  for (let yr = 1; yr <= 25; yr++) {
    gridCostByYear.push(Math.round(gridCost));
    gridCost *= 1.06;
  }

  const maxBarH = Math.max(summary.netCost, Math.abs(profit25), 1);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:px-12 md:py-24">
      <CommercialSectionHeader
        num="03"
        label={isHi ? "वित्तीय विश्लेषण" : "Financial Intelligence"}
        title={isHi ? "25-वर्षीय आर्थिक विश्लेषण" : "25-Year Economic Analysis"}
        subtitle={
          isHi
            ? "ग्रिड बिजली की बढ़ती दरें (6% p.a.) बनाम सौर की स्थिर लागत"
            : "Rising grid tariffs (6% p.a.) vs flat solar cost — detailed year-by-year cashflow"
        }
      />

      {/* 4 key metric cards */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {keyMetrics.map((m, i) => (
          <KpiCard
            key={m.label}
            label={m.label}
            value={m.value}
            sub={m.note}
            accent={m.accent}
            delay={i * 0.07}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cashflow table */}
        <SectionReveal delay={0.05}>
          <GlassPanel>
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 py-4">
              <BarChart2 className="h-4 w-4 text-sky-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {isHi ? "वर्ष-दर-वर्ष नकद प्रवाह" : "Year-by-Year Cashflow Statement"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-5 py-2.5 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {isHi ? "वर्ष" : "Year"}
                    </th>
                    <th className="px-5 py-2.5 text-right text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {isHi ? "ग्रिड लागत" : "Grid Cost"}
                    </th>
                    <th className="px-5 py-2.5 text-right text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {isHi ? "सौर बचत" : "Solar Saving"}
                    </th>
                    <th className="px-5 py-2.5 text-right text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {isHi ? "संचयी" : "Cumulative"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => {
                    const gridY = gridCostByYear[row.year - 1] ?? 0;
                    const isBreakEven = row.year === breakEvenYear;
                    const isProfit = row.cumulative >= 0;
                    const isMilestone = [10, 15, 20, 25].includes(row.year);
                    return (
                      <motion.tr
                        key={row.year}
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.04 }}
                        className={`border-b border-slate-100/80 transition-colors ${
                          isBreakEven
                            ? "bg-emerald-50/80"
                            : isMilestone
                              ? "bg-slate-50/60"
                              : ""
                        }`}
                      >
                        <td className="px-5 py-3">
                          <span
                            className={`text-xs font-semibold ${
                              isMilestone ? "text-sky-700" : "text-slate-700"
                            }`}
                          >
                            {isHi ? `वर्ष ${row.year}` : `Yr ${row.year}`}
                          </span>
                          {isBreakEven && (
                            <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-xs tabular-nums text-slate-400">
                          {fmtL(gridY)}
                        </td>
                        <td className="px-5 py-3 text-right text-xs font-semibold tabular-nums text-emerald-700">
                          {fmtL(row.saving)}
                        </td>
                        <td
                          className={`px-5 py-3 text-right text-xs font-bold tabular-nums ${
                            isProfit ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {row.cumulative >= 0 ? "+" : ""}
                          {fmtL(row.cumulative)}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">
              * {isHi ? "6% वार्षिक टैरिफ वृद्धि मानकर" : "Assumes 6% annual electricity tariff escalation"}
            </p>
          </GlassPanel>
        </SectionReveal>

        {/* Profit chart + break-even callout */}
        <div className="flex flex-col gap-5">
          <SectionReveal delay={0.1}>
            <GlassPanel className="p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {isHi ? "संचयी लाभ (25 वर्ष)" : "Cumulative Profit Trajectory"}
                </p>
              </div>
              <div className="flex h-48 items-end gap-0.5">
                {cashflow25.filter((_, i) => i % 2 === 0).map((row, i) => {
                  const isPos = row.cumulative >= 0;
                  const h = Math.min((Math.abs(row.cumulative) / maxBarH) * 100, 100);
                  return (
                    <div
                      key={row.year}
                      className="relative flex flex-1 flex-col items-center"
                      style={{ height: "100%" }}
                    >
                      <div className="relative flex h-full w-full flex-col items-center justify-end">
                        {isPos ? (
                          <motion.div
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.03, type: "spring", stiffness: 80, damping: 18 }}
                            className="w-full rounded-t bg-gradient-to-t from-emerald-700 to-emerald-400"
                          />
                        ) : (
                          <motion.div
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.03, type: "spring", stiffness: 80, damping: 18 }}
                            className="mt-auto w-full rounded-b bg-gradient-to-b from-rose-400 to-rose-600"
                          />
                        )}
                      </div>
                      <span className="mt-1 text-[9px] text-slate-400">{row.year}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-right text-[10px] font-medium text-slate-400">
                {isHi ? "वर्ष →" : "Year →"}
              </p>
            </GlassPanel>
          </SectionReveal>

          {/* Break-even callout */}
          <SectionReveal delay={0.18}>
            <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                {isHi ? "ब्रेक-ईवन सारांश" : "Break-Even Summary"}
              </p>
              <p className="mt-3 text-sm font-semibold text-emerald-800">
                {isHi
                  ? `वर्ष ${breakEvenYear} में पूरा निवेश वापस`
                  : `Full investment recovered in Year ${breakEvenYear}`}
              </p>
              <p className="mt-1.5 text-base text-emerald-700">
                {isHi ? "उसके बाद 25 वर्ष में " : "Then "}
                <span className="text-2xl font-black text-emerald-800">{fmtL(profit25)}</span>
                {isHi ? " शुद्ध लाभ" : " net profit over 25 years"}
              </p>
            </div>
          </SectionReveal>
        </div>
      </div>
    </div>
  );
}
