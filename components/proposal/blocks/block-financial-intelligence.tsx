"use client";

/**
 * BlockFinancialIntelligence — commercial financial analysis block.
 *
 * Used by the `commercial_executive` preset as the `payback_analysis` block.
 *
 * Shows:
 *   - Multi-year cashflow table (Year 1–10 / Year 25 summary)
 *   - Grid energy cost vs solar cost divergence
 *   - ROI / IRR estimate
 *   - Break-even year highlighted
 *   - 25-year profit summary
 */

import { motion } from "framer-motion";
import { BarChart2, CheckCircle2, TrendingUp } from "lucide-react";
import type { BlockRenderContext } from "@/lib/proposal-block-context";
import {
  BlockAnimatedINR,
  BlockPanel,
  BlockSectionTitle,
  BlockStatTile,
} from "@/components/proposal/blocks/proposal-block-utils";
import { ProposalJourneySection } from "@/components/proposal/proposal-journey";

type Props = Pick<BlockRenderContext, "summary" | "lang" | "D" | "darkMode">;

const inr = (v: number) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`;
const inrL = (v: number) => {
  const x = Math.max(0, Math.round(v));
  if (x >= 100000) return `₹${(x / 100000).toFixed(1)}L`;
  if (x >= 1000) return `₹${(x / 1000).toFixed(0)}k`;
  return inr(x);
};

export function BlockFinancialIntelligence({ summary, lang, darkMode }: Props) {
  const isHi = lang === "hi";
  const dark = darkMode;

  const kicker = isHi ? "वित्तीय विश्लेषण" : "Financial Intelligence";
  const title = isHi ? "निवेश पर रिटर्न — वर्ष-दर-वर्ष" : "Return on Investment — Year by Year";
  const subtitle = isHi
    ? "बिजली की बढ़ती दरें (6% p.a.) बनाम सौर ऊर्जा की स्थिर लागत"
    : "Rising grid tariffs (6% p.a.) vs flat solar cost after payback";

  // Compute year-wise grid saving with 6% annual tariff escalation
  const ESCALATION = 0.06;
  const cashflowRows: { year: number; saving: number; cumulative: number }[] = [];
  let cumulative = -summary.netCost;
  let annualSaving = summary.annualSaving;
  for (let yr = 1; yr <= 25; yr++) {
    cumulative += annualSaving;
    cashflowRows.push({ year: yr, saving: Math.round(annualSaving), cumulative: Math.round(cumulative) });
    annualSaving *= 1 + ESCALATION;
  }

  const breakEvenYear = cashflowRows.find((r) => r.cumulative >= 0)?.year ?? summary.paybackYears;
  const profit25 = cashflowRows[24]?.cumulative ?? summary.solarVsGrid.netSaving;
  const roiPct = summary.netCost > 0 ? Math.round((summary.annualSaving / summary.netCost) * 100) : 0;
  const irr = summary.paybackYears > 0 ? Math.round((72 / summary.paybackYears) * 10) / 10 : 0;

  const displayRows = [...cashflowRows.slice(0, 5), cashflowRows[9], cashflowRows[14], cashflowRows[24]].filter(Boolean);

  const topStats = [
    { label: isHi ? "प्रारंभिक ROI" : "First-Year ROI", value: `${roiPct}%`, tone: "green" as const },
    { label: isHi ? "अनुमानित IRR" : "Estimated IRR", value: `${irr}%`, tone: "blue" as const },
    { label: isHi ? "ब्रेक-ईवन वर्ष" : "Break-Even Year", value: `${breakEvenYear}`, tone: "ink" as const },
    { label: isHi ? "25 वर्ष लाभ" : "25-yr Profit", value: inrL(profit25), tone: "amber" as const },
  ];

  return (
    <ProposalJourneySection id="payback-analysis">
      <BlockSectionTitle kicker={kicker} title={title} subtitle={subtitle} dark={dark} lang={lang} />

      {/* Top stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {topStats.map((s, i) => (
          <BlockStatTile
            key={s.label}
            label={s.label}
            value={s.value}
            tone={s.tone}
            delay={i * 0.07}
            dark={dark}
            lang={lang}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cashflow table */}
        <BlockPanel dark={dark}>
          <div className="mb-3 flex items-center gap-2">
            <BarChart2 className={`h-4 w-4 ${dark ? "text-sky-400" : "text-sky-600"}`} />
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>
              {isHi ? "वर्ष-दर-वर्ष नकद प्रवाह" : "Year-by-Year Cashflow"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? "text-slate-400 border-b border-white/10" : "text-slate-500 border-b border-slate-200"}`}>
                  <th className="pb-2 text-left">{isHi ? "वर्ष" : "Year"}</th>
                  <th className="pb-2 text-right">{isHi ? "बचत" : "Saving"}</th>
                  <th className="pb-2 text-right">{isHi ? "संचयी" : "Cumulative"}</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => {
                  const isBreakEven = row.year === Number(breakEvenYear);
                  const isProfit = row.cumulative >= 0;
                  const isSpecial = row.year === 10 || row.year === 15 || row.year === 25;
                  return (
                    <motion.tr
                      key={row.year}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04 }}
                      className={`border-b text-xs ${
                        dark ? "border-white/5" : "border-slate-100"
                      } ${isBreakEven ? (dark ? "bg-emerald-900/30" : "bg-emerald-50") : ""}`}
                    >
                      <td className={`py-1.5 font-medium ${isSpecial ? (dark ? "text-sky-300" : "text-sky-700") : (dark ? "text-slate-300" : "text-slate-700")}`}>
                        {isHi ? `वर्ष ${row.year}` : `Yr ${row.year}`}
                        {isBreakEven ? (
                          <CheckCircle2 className="ml-1 inline h-3 w-3 text-emerald-500" />
                        ) : null}
                      </td>
                      <td className={`py-1.5 text-right tabular-nums ${dark ? "text-slate-300" : "text-slate-700"}`}>
                        {inrL(row.saving)}
                      </td>
                      <td className={`py-1.5 text-right tabular-nums font-semibold ${
                        isProfit
                          ? dark ? "text-emerald-400" : "text-emerald-700"
                          : dark ? "text-rose-400" : "text-rose-700"
                      }`}>
                        {row.cumulative >= 0 ? "+" : ""}{inrL(row.cumulative)}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={`mt-3 text-[10px] ${dark ? "text-slate-500" : "text-slate-400"}`}>
            {isHi ? "* 6% वार्षिक बिजली दर वृद्धि मानकर" : "* Assumes 6% annual electricity tariff escalation"}
          </p>
        </BlockPanel>

        {/* Visual cumulative curve */}
        <BlockPanel dark={dark}>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className={`h-4 w-4 ${dark ? "text-emerald-400" : "text-emerald-600"}`} />
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>
              {isHi ? "25 वर्ष संचयी लाभ" : "25-Year Cumulative Profit"}
            </p>
          </div>

          {/* Simple bar chart showing profit trajectory */}
          <div className="flex h-48 items-end gap-0.5">
            {cashflowRows.filter((_, i) => i % 2 === 0).map((row, i) => {
              const maxAbs = Math.max(summary.netCost, profit25, 1);
              const isPos = row.cumulative >= 0;
              const h = Math.abs(row.cumulative / maxAbs) * 100;
              return (
                <div key={row.year} className="relative flex flex-1 flex-col items-center justify-end h-full">
                  {isPos ? (
                    <div className="w-full flex flex-col justify-end" style={{ height: "50%" }}>
                      <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${Math.min(h * 2, 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.04, type: "spring", stiffness: 80 }}
                        className="w-full rounded-t-sm bg-gradient-to-t from-emerald-600 to-emerald-400"
                      />
                    </div>
                  ) : (
                    <div className="w-full flex flex-col justify-start" style={{ height: "50%" }}>
                      <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${Math.min(h * 2, 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.04, type: "spring", stiffness: 80 }}
                        className="w-full rounded-b-sm bg-gradient-to-b from-rose-400 to-rose-600"
                      />
                    </div>
                  )}
                  <span className="mt-1 text-[9px] text-slate-500">{row.year}</span>
                </div>
              );
            })}
          </div>

          {/* Break-even callout */}
          <div className={`mt-4 rounded-xl border p-3 ${dark ? "border-emerald-500/30 bg-emerald-900/20" : "border-emerald-200 bg-emerald-50"}`}>
            <p className={`text-xs font-semibold ${dark ? "text-emerald-300" : "text-emerald-800"}`}>
              {isHi
                ? `वर्ष ${breakEvenYear} में ब्रेक-ईवन — उसके बाद 25 वर्ष में`
                : `Break-even in Year ${breakEvenYear} — then `}
              {!isHi && (
                <span className="font-bold">
                  <BlockAnimatedINR value={profit25} /> {isHi ? "लाभ" : "pure profit"}
                </span>
              )}
              {isHi && (
                <>
                  <BlockAnimatedINR value={profit25} /> शुद्ध लाभ
                </>
              )}
            </p>
          </div>
        </BlockPanel>
      </div>
    </ProposalJourneySection>
  );
}
