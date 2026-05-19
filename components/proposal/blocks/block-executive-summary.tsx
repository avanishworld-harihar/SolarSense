"use client";

/**
 * BlockExecutiveSummary — commercial executive block.
 *
 * Designed for the `commercial_executive` preset.
 * Leads the proposal with maximum commercial impact:
 * headline savings, payback, net cost, and a single-screen
 * "why solar now" rationale that decision-makers read before the technical detail.
 *
 * Visually consistent with the residential proposal design language:
 * glassmorphism panels, count-up animations, gradient accents.
 */

import { motion } from "framer-motion";
import { Banknote, CalendarCheck, Leaf, TrendingUp, Zap } from "lucide-react";
import type { BlockRenderContext } from "@/lib/proposal-block-context";
import {
  BlockAnimatedINR,
  BlockPanel,
  BlockSectionTitle,
  BlockStatTile,
} from "@/components/proposal/blocks/proposal-block-utils";
import { ProposalJourneySection } from "@/components/proposal/proposal-journey";

type Props = Pick<
  BlockRenderContext,
  "summary" | "lang" | "D" | "darkMode" | "installer" | "honoredDisplay" | "storyVariant"
>;

const inr = (v: number) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`;

export function BlockExecutiveSummary({ summary, lang, darkMode, installer, honoredDisplay, storyVariant }: Props) {
  const isHi = lang === "hi";
  const dark = darkMode;

  // Wave 3 P6: use story variant copy when available, fall back to built-in.
  const kicker = storyVariant
    ? (isHi ? "कार्यकारी सारांश — वाणिज्यिक सौर प्रस्ताव" : "Executive Summary — Commercial Solar Proposal")
    : (isHi
        ? "कार्यकारी सारांश — वाणिज्यिक सौर प्रस्ताव"
        : "Executive Summary — Commercial Solar Proposal");
  const title = storyVariant
    ? storyVariant.headline
        .replace("{kw}", String(summary.systemKw))
        .replace("{savings_annual}", Math.round(summary.annualSaving).toLocaleString("en-IN"))
        .replace("{payback_years}", summary.paybackYears.toFixed(1))
        .replace("{net_cost}", Math.round(summary.netCost).toLocaleString("en-IN"))
    : (isHi
        ? `${honoredDisplay} के लिए सौर प्रस्ताव`
        : `Solar Proposal for ${honoredDisplay}`);
  const subtitle = storyVariant
    ? storyVariant.opening
        .replace("{kw}", String(summary.systemKw))
        .replace("{savings_annual}", Math.round(summary.annualSaving).toLocaleString("en-IN"))
        .replace("{payback_years}", summary.paybackYears.toFixed(1))
        .replace("{net_cost}", Math.round(summary.netCost).toLocaleString("en-IN"))
    : (isHi
        ? `${summary.systemKw} kW ऑन-ग्रिड सौर संयंत्र · ${installer.name}`
        : `${summary.systemKw} kW On-Grid Solar System · ${installer.name}`);

  const roiPct =
    summary.netCost > 0
      ? Math.round((summary.annualSaving / summary.netCost) * 100)
      : 0;

  const interpolate = (s: string) =>
    s
      .replace("{kw}", String(summary.systemKw))
      .replace("{savings_annual}", Math.round(summary.annualSaving).toLocaleString("en-IN"))
      .replace("{payback_years}", summary.paybackYears.toFixed(1))
      .replace("{net_cost}", Math.round(summary.netCost).toLocaleString("en-IN"));

  // Wave 3 P6: when storyVariant is present, build points from roi_hook + closing
  const points = storyVariant
    ? [
        interpolate(storyVariant.roi_hook),
        interpolate(storyVariant.closing),
        ...(isHi
          ? [
              `PM सूर्य घर अनुदान के बाद शुद्ध निवेश ₹${(summary.netCost / 100000).toFixed(1)}L`,
              `DISCOM ग्रिड से 24×7 बैकअप के साथ नेट-मीटरिंग`,
            ]
          : [
              `Net investment ₹${(summary.netCost / 100000).toFixed(1)}L after PM Surya Ghar subsidy`,
              `Net-metering with DISCOM grid backup for uninterrupted operations`,
            ]),
      ]
    : (isHi
      ? [
          `बिजली की बढ़ती दरों से सुरक्षा — अगले 25 साल स्थिर ऊर्जा लागत`,
          `PM सूर्य घर अनुदान के बाद शुद्ध निवेश ₹${(summary.netCost / 100000).toFixed(1)}L`,
          `${summary.paybackYears.toFixed(1)} वर्ष में ROI — उसके बाद शुद्ध लाभ`,
          `DISCOM ग्रिड से 24×7 बैकअप के साथ नेट-मीटरिंग`,
        ]
      : [
          `Protection from rising electricity tariffs — stable energy costs for 25 years`,
          `Net investment ₹${(summary.netCost / 100000).toFixed(1)}L after PM Surya Ghar subsidy`,
          `${summary.paybackYears.toFixed(1)}-year payback — pure profit every year after that`,
          `Net-metering with DISCOM grid backup for uninterrupted operations`,
        ]);

  const tiles = [
    {
      label: isHi ? "वार्षिक बचत" : "Annual Saving",
      value: inr(summary.annualSaving),
      rawValue: summary.annualSaving,
      tone: "green" as const,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      label: isHi ? "पेबैक अवधि" : "Payback Period",
      value: `${summary.paybackYears.toFixed(1)} ${isHi ? "वर्ष" : "yr"}`,
      tone: "blue" as const,
      icon: <CalendarCheck className="h-4 w-4" />,
    },
    {
      label: isHi ? "शुद्ध निवेश" : "Net Investment",
      value: inr(summary.netCost),
      rawValue: summary.netCost,
      tone: "ink" as const,
      icon: <Banknote className="h-4 w-4" />,
    },
    {
      label: isHi ? "25 वर्ष ROI" : "25-yr ROI",
      value: `${roiPct}%`,
      tone: "amber" as const,
      icon: <Zap className="h-4 w-4" />,
    },
  ];

  return (
    <ProposalJourneySection id="executive-summary">
      <BlockSectionTitle kicker={kicker} title={title} subtitle={subtitle} dark={dark} lang={lang} />

      {/* Hero metrics ribbon */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t, i) => (
          <BlockStatTile
            key={t.label}
            label={t.label}
            value={t.value}
            rawValue={t.rawValue}
            tone={t.tone}
            delay={i * 0.07}
            dark={dark}
            lang={lang}
          />
        ))}
      </div>

      {/* Why solar now — commercial rationale */}
      <BlockPanel dark={dark} className="mb-5">
        <div className="mb-4 flex items-center gap-2">
          <Leaf className={`h-4 w-4 ${dark ? "text-emerald-400" : "text-emerald-600"}`} />
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
              dark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {isHi ? "सौर अपनाने के प्रमुख कारण" : "Key reasons to go solar now"}
          </p>
        </div>
        <ul className="flex flex-col gap-2.5">
          {points.map((pt, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 * i, duration: 0.4 }}
              className={`flex gap-3 text-sm ${dark ? "text-slate-300" : "text-slate-700"}`}
            >
              <span
                className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                  dark ? "bg-emerald-400" : "bg-emerald-500"
                }`}
              />
              {pt}
            </motion.li>
          ))}
        </ul>
      </BlockPanel>

      {/* Quick system snapshot */}
      <div className="grid gap-3 sm:grid-cols-3">
        <BlockPanel dark={dark}>
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {isHi ? "सिस्टम क्षमता" : "System Capacity"}
          </p>
          <p className={`mt-1 text-2xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
            {summary.systemKw} kW
          </p>
          <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {summary.panels} × 540W {summary.brands.panel}
          </p>
        </BlockPanel>
        <BlockPanel dark={dark}>
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {isHi ? "वार्षिक उत्पादन" : "Annual Generation"}
          </p>
          <p className={`mt-1 text-2xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
            {summary.annualGen.toLocaleString("en-IN")}
          </p>
          <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {isHi ? "kWh / वर्ष" : "kWh / year"}
          </p>
        </BlockPanel>
        <BlockPanel dark={dark}>
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {isHi ? "25 वर्ष की बचत" : "25-yr Net Saving"}
          </p>
          <p className={`mt-1 text-2xl font-bold ${dark ? "text-emerald-300" : "text-emerald-700"}`}>
            <BlockAnimatedINR value={summary.solarVsGrid.netSaving} />
          </p>
        </BlockPanel>
      </div>

      {/* P10 — Story mode placeholder paragraph (shown when no story mode is selected) */}
      {!storyVariant && (
        <div className={`mt-4 rounded-xl border border-dashed px-4 py-3 text-center text-[12px] ${
          dark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"
        }`}>
          {isHi
            ? "Story Mode: अपने प्रेज़ेंटेशन की कथा शैली चुनने के लिए प्रेज़ेट सेटिंग्स में Story Mode चुनें।"
            : "Story Mode: Select a narrative style in preset settings to tailor this section for your audience."}
        </div>
      )}
    </ProposalJourneySection>
  );
}
