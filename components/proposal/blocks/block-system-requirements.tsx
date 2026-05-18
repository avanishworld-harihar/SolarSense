"use client";

/**
 * BlockSystemRequirements — standalone system requirements block.
 *
 * Used by:
 *   - `commercial_executive` preset (always, as the primary technical page)
 *   - `residential_smart` preset when `billAuditBacked = false` (no bill uploaded)
 *
 * Shows: system sizing rationale, annual generation, energy coverage,
 * generation profile, and a commercial snapshot.
 *
 * This is a standalone version of the SystemRequirementSection from proposal-view.tsx.
 * Visually distinct for commercial context — cleaner, more metrics-forward.
 */

import { motion } from "framer-motion";
import { Activity, Building2, Cpu, Sun, Zap } from "lucide-react";
import type { BlockRenderContext } from "@/lib/proposal-block-context";
import {
  BlockAnimatedINR,
  BlockPanel,
  BlockSectionTitle,
  BlockStatTile,
  BlockMetricRow,
} from "@/components/proposal/blocks/proposal-block-utils";
import { ProposalJourneySection } from "@/components/proposal/proposal-journey";

type Props = Pick<BlockRenderContext, "summary" | "lang" | "D" | "darkMode">;

const inr = (v: number) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`;

export function BlockSystemRequirements({ summary, lang, darkMode }: Props) {
  const isHi = lang === "hi";
  const dark = darkMode;

  const kicker = isHi ? "सिस्टम विनिर्देश" : "System Specifications";
  const title = isHi
    ? "आपकी ज़रूरत के अनुसार सिस्टम डिज़ाइन"
    : "System Designed for Your Requirement";
  const subtitle = isHi
    ? "क्षमता, उत्पादन और कवरेज — आपकी ऊर्जा आवश्यकता पर आधारित"
    : "Capacity, generation, and coverage — based on your energy requirement";

  const monthlyGen = Math.round(summary.annualGen / 12);
  const coveragePct = Math.min(100, Math.round(summary.coverage));

  // Generate bar heights for a simple monthly generation chart
  const months = isHi
    ? ["जन", "फर", "मार", "अप्र", "मई", "जून", "जुल", "अग", "सित", "अक्त", "नव", "दिस"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // Approximate seasonal generation factors (India, typical)
  const genFactors = [0.82, 0.88, 0.95, 1.0, 1.0, 0.88, 0.72, 0.72, 0.85, 0.92, 0.88, 0.82];
  const genValues = genFactors.map((f) => Math.round(monthlyGen * f));
  const maxGen = Math.max(...genValues, 1);

  const systemMetrics = [
    {
      label: isHi ? "स्थापित क्षमता" : "Installed Capacity",
      value: `${summary.systemKw} kW`,
      icon: <Zap className="h-4 w-4 text-amber-500" />,
    },
    {
      label: isHi ? "सौर पैनल" : "Solar Panels",
      value: `${summary.panels} × 540W`,
      icon: <Sun className="h-4 w-4 text-amber-500" />,
    },
    {
      label: isHi ? "इन्वर्टर" : "Inverter",
      value: `${summary.systemKw} kW On-Grid`,
      icon: <Cpu className="h-4 w-4 text-sky-500" />,
    },
    {
      label: isHi ? "नेट-मीटरिंग" : "Net-Metering",
      value: isHi ? "ग्रिड कनेक्टेड" : "Grid Connected",
      icon: <Activity className="h-4 w-4 text-emerald-500" />,
    },
  ];

  return (
    <ProposalJourneySection id="system-requirement">
      <BlockSectionTitle kicker={kicker} title={title} subtitle={subtitle} dark={dark} lang={lang} />

      {/* Top stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BlockStatTile
          label={isHi ? "वार्षिक उत्पादन" : "Annual Generation"}
          value={`${summary.annualGen.toLocaleString("en-IN")} kWh`}
          delay={0}
          tone="green"
          dark={dark}
          lang={lang}
        />
        <BlockStatTile
          label={isHi ? "मासिक औसत" : "Monthly Average"}
          value={`${monthlyGen.toLocaleString("en-IN")} kWh`}
          delay={0.07}
          tone="blue"
          dark={dark}
          lang={lang}
        />
        <BlockStatTile
          label={isHi ? "ऊर्जा कवरेज" : "Energy Coverage"}
          value={`${coveragePct}%`}
          delay={0.14}
          tone="ink"
          dark={dark}
          lang={lang}
        />
        <BlockStatTile
          label={isHi ? "पैनल ब्रांड" : "Panel Brand"}
          value={summary.brands.panel}
          delay={0.21}
          tone="ink"
          dark={dark}
          lang={lang}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly generation chart */}
        <BlockPanel dark={dark}>
          <p
            className={`mb-4 text-[10px] font-semibold ${
              dark ? "text-slate-400" : "text-slate-500"
            } ${isHi ? "tracking-normal" : "uppercase tracking-[0.18em]"}`}
          >
            {isHi ? "मासिक उत्पादन अनुमान (kWh)" : "Monthly Generation Estimate (kWh)"}
          </p>
          <div className="flex h-44 items-end gap-0.5 border-b-2 border-slate-300/80 sm:h-52">
            {genValues.map((v, i) => {
              const h = (v / maxGen) * 100;
              return (
                <div key={months[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", delay: i * 0.025, stiffness: 100, damping: 18 }}
                    style={{ minHeight: h > 0 ? 3 : 0 }}
                    className="w-full max-w-[1.8rem] rounded-t-sm bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.35)]"
                  />
                  <span className="text-[9px] font-medium text-slate-500 sm:text-[10px]">
                    {months[i]}
                  </span>
                </div>
              );
            })}
          </div>
          <p className={`mt-3 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {isHi
              ? `औसत ${monthlyGen.toLocaleString("en-IN")} kWh / माह · वार्षिक कुल ${summary.annualGen.toLocaleString("en-IN")} kWh`
              : `Avg ${monthlyGen.toLocaleString("en-IN")} kWh / mo · Annual total ${summary.annualGen.toLocaleString("en-IN")} kWh`}
          </p>
        </BlockPanel>

        {/* Right column: system specs + commercial snapshot */}
        <div className="flex flex-col gap-3">
          {/* System specs */}
          <BlockPanel dark={dark}>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className={`h-4 w-4 ${dark ? "text-sky-400" : "text-sky-600"}`} />
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>
                {isHi ? "सिस्टम विशेषताएं" : "System Specifications"}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {systemMetrics.map((m) => (
                <div key={m.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {m.icon}
                    <span className={`text-xs ${dark ? "text-slate-400" : "text-slate-600"}`}>{m.label}</span>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${dark ? "text-white" : "text-slate-900"}`}>
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </BlockPanel>

          {/* Commercial snapshot */}
          <BlockPanel dark={dark}>
            <p className={`mb-3 text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>
              {isHi ? "वाणिज्यिक सारांश" : "Commercial Snapshot"}
            </p>
            <div className="flex flex-col gap-2">
              <BlockMetricRow
                label={isHi ? "कुल लागत" : "Gross Cost"}
                value={inr(summary.grossSystemCost)}
              />
              <BlockMetricRow
                label={isHi ? "PM सूर्य घर अनुदान" : "PM Surya Ghar Subsidy"}
                value={`−${inr(summary.pmSubsidy)}`}
              />
              <BlockMetricRow
                label={isHi ? "शुद्ध निवेश" : "Net Investment"}
                value={<BlockAnimatedINR value={summary.netCost} />}
                accent
              />
              <BlockMetricRow
                label={isHi ? "वार्षिक बचत" : "Annual Saving"}
                value={inr(summary.annualSaving)}
              />
              <BlockMetricRow
                label={isHi ? "पेबैक अवधि" : "Payback Period"}
                value={`${summary.paybackYears.toFixed(1)} ${isHi ? "वर्ष" : "yr"}`}
              />
            </div>
          </BlockPanel>
        </div>
      </div>
    </ProposalJourneySection>
  );
}
