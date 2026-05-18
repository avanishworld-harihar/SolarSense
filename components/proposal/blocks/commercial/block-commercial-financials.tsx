"use client";

/**
 * BlockCommercialFinancials — premium financial intelligence for commercial proposals.
 *
 * Executive-grade financial analysis section:
 *   - Key financial metrics banner (ROI, IRR, LCOE, NPV proxy)
 *   - Multi-year cashflow table (year 1–5, then 10, 15, 20, 25)
 *     with columns: Grid Cost | Solar Saving | Cumulative | Status
 *   - 25-year profit visualization (ascending bar chart)
 *   - Key assumptions footnote
 *
 * Commercial design language: white bg, tight table rows, precise numbers,
 * emerald for profit / rose for cost, no decorative elements.
 */

import { motion } from "framer-motion";
import { BarChart2, CheckCircle2, TrendingUp } from "lucide-react";
import type { CommercialCtx } from "@/components/proposal/commercial-proposal-view";

const fmtL = (v: number, abs = false) => {
  const val = abs ? Math.abs(v) : v;
  if (Math.abs(val) >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100_000) return `₹${(val / 100_000).toFixed(1)} L`;
  if (Math.abs(val) >= 1_000) return `₹${(val / 1_000).toFixed(0)} k`;
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
};

function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{num}</span>
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-600">{label}</span>
    </div>
  );
}

type Props = { ctx: CommercialCtx };

export function BlockCommercialFinancials({ ctx }: Props) {
  const { summary, roiPct, irr, cashflow25, breakEvenYear, profit25, lcoe, lang } = ctx;
  const isHi = lang === "hi";

  // Compute NPV at 10% discount rate (simplified)
  const DISCOUNT_RATE = 0.1;
  const npv = cashflow25.reduce((acc, row) => {
    return acc + row.saving / Math.pow(1 + DISCOUNT_RATE, row.year);
  }, -summary.netCost);

  const keyMetrics = [
    {
      label: isHi ? "प्रथम वर्ष ROI" : "First-Year ROI",
      value: `${roiPct}%`,
      note: isHi ? "वार्षिक" : "annualised",
    },
    {
      label: isHi ? "अनुमानित IRR" : "Estimated IRR",
      value: `${irr}%`,
      note: isHi ? "Rule of 72 आधार" : "Rule-of-72 basis",
    },
    {
      label: "LCOE",
      value: `₹${lcoe}/kWh`,
      note: isHi ? "25 वर्ष लागत" : "levelised cost of energy",
    },
    {
      label: isHi ? "NPV (10%)" : "NPV (@ 10%)",
      value: fmtL(npv),
      note: npv > 0 ? (isHi ? "सकारात्मक" : "positive") : (isHi ? "नकारात्मक" : "negative"),
    },
  ];

  // Display rows: years 1-5, then 10, 15, 20, 25
  const displayYears = [1, 2, 3, 4, 5, 10, 15, 20, 25];
  const displayRows = cashflow25.filter((r) => displayYears.includes(r.year));

  // Grid cost for each display year (derived from annualSaving escalation)
  // Grid cost = currentYearlyBill * (1.06)^(yr-1) before solar
  const gridCostByYear: number[] = [];
  let gridCost = summary.yearlyBill;
  for (let yr = 1; yr <= 25; yr++) {
    gridCostByYear.push(Math.round(gridCost));
    gridCost *= 1.06;
  }

  const maxBarH = profit25;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <SectionLabel num="03" label={isHi ? "वित्तीय विश्लेषण" : "Financial Intelligence"} />

      <div className="mb-3">
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
          {isHi ? "25-वर्षीय आर्थिक विश्लेषण" : "25-Year Economic Analysis"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isHi
            ? "ग्रिड बिजली की बढ़ती दरें (6% p.a.) बनाम सौर की स्थिर लागत"
            : "Rising grid tariffs (6% p.a.) vs flat solar cost — detailed year-by-year cashflow"}
        </p>
      </div>

      {/* Key financial metrics banner */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {keyMetrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">{m.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{m.value}</p>
            <p className="text-[10px] text-slate-500">{m.note}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Cashflow table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <BarChart2 className="h-4 w-4 text-sky-500" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              {isHi ? "वर्ष-दर-वर्ष नकद प्रवाह" : "Year-by-Year Cashflow Statement"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2 text-left">{isHi ? "वर्ष" : "Year"}</th>
                  <th className="px-4 py-2 text-right">{isHi ? "ग्रिड लागत" : "Grid Cost"}</th>
                  <th className="px-4 py-2 text-right">{isHi ? "सौर बचत" : "Solar Saving"}</th>
                  <th className="px-4 py-2 text-right">{isHi ? "संचयी" : "Cumulative"}</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => {
                  const gridY = gridCostByYear[row.year - 1] ?? 0;
                  const isBreakEven = row.year === breakEvenYear;
                  const isProfit = row.cumulative >= 0;
                  const isHighlight = [10, 15, 20, 25].includes(row.year);
                  return (
                    <motion.tr
                      key={row.year}
                      initial={{ opacity: 0, x: -6 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.03 }}
                      className={`border-b border-slate-100 transition-colors ${
                        isBreakEven ? "bg-emerald-50" : isHighlight ? "bg-slate-50/70" : ""
                      }`}
                    >
                      <td className={`px-4 py-2 font-medium ${isHighlight ? "text-sky-700" : "text-slate-700"}`}>
                        {isHi ? `वर्ष ${row.year}` : `Yr ${row.year}`}
                        {isBreakEven && (
                          <CheckCircle2 className="ml-1.5 inline h-3 w-3 text-emerald-500" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                        {fmtL(gridY)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-emerald-700">
                        {fmtL(row.saving)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums font-semibold ${
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
          <p className="px-5 py-2.5 text-[10px] text-slate-400">
            * {isHi ? "6% वार्षिक टैरिफ वृद्धि मानकर" : "Assumes 6% annual electricity tariff escalation"}
          </p>
        </div>

        {/* Profit trajectory chart */}
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {isHi ? "संचयी लाभ (25 वर्ष)" : "Cumulative Profit Trajectory"}
              </p>
            </div>
            <div className="flex h-44 items-end gap-0.5">
              {cashflow25.filter((_, i) => i % 2 === 0).map((row, i) => {
                const maxA = Math.max(summary.netCost, Math.abs(maxBarH), 1);
                const isPos = row.cumulative >= 0;
                const h = Math.min((Math.abs(row.cumulative) / maxA) * 100, 100);
                return (
                  <div key={row.year} className="relative flex flex-1 flex-col items-center" style={{ height: "100%" }}>
                    <div className="relative flex h-full w-full flex-col items-center justify-end">
                      {isPos ? (
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.03, type: "spring", stiffness: 80 }}
                          className="w-full rounded-t-sm bg-gradient-to-t from-emerald-600 to-emerald-400"
                        />
                      ) : (
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.03, type: "spring", stiffness: 80 }}
                          className="mt-auto w-full rounded-b-sm bg-gradient-to-b from-rose-400 to-rose-600"
                        />
                      )}
                    </div>
                    <span className="mt-1 text-[9px] text-slate-400">{row.year}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-right text-[10px] text-slate-400">{isHi ? "वर्ष →" : "Year →"}</p>
          </div>

          {/* Break-even callout */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600">
              {isHi ? "ब्रेक-ईवन सारांश" : "Break-Even Summary"}
            </p>
            <p className="mt-2 text-sm font-medium text-emerald-800">
              {isHi
                ? `वर्ष ${breakEvenYear} में पूरा निवेश वापस`
                : `Full investment recovered in Year ${breakEvenYear}`}
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              {isHi ? "उसके बाद 25 वर्ष में " : "Then "}
              <span className="font-bold">{fmtL(profit25)}</span>
              {isHi ? " शुद्ध लाभ" : " net profit over 25 years"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
