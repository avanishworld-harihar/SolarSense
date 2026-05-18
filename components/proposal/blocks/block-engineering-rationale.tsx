"use client";

/**
 * BlockEngineeringRationale — technical justification block for commercial proposals.
 *
 * Shows the technical design rationale behind the commercial solar system:
 * DC/AC ratio, performance ratio, capacity factor, efficiency, warranty.
 * Designed for commercial decision-makers who need the engineering basis.
 *
 * Used by the `commercial_executive` preset as a secondary technical block.
 * In the layout, it typically follows BlockSystemRequirements.
 */

import { motion } from "framer-motion";
import { Gauge, ShieldCheck, Sun, Zap } from "lucide-react";
import type { BlockRenderContext } from "@/lib/proposal-block-context";
import {
  BlockPanel,
  BlockSectionTitle,
  BlockMetricRow,
} from "@/components/proposal/blocks/proposal-block-utils";
import { ProposalJourneySection } from "@/components/proposal/proposal-journey";

type Props = Pick<BlockRenderContext, "summary" | "lang" | "D" | "darkMode">;

export function BlockEngineeringRationale({ summary, lang, darkMode }: Props) {
  const isHi = lang === "hi";
  const dark = darkMode;

  const kicker = isHi ? "इंजीनियरिंग आधार" : "Engineering Rationale";
  const title = isHi ? "तकनीकी डिज़ाइन आधार" : "Technical Design Basis";
  const subtitle = isHi
    ? "सिस्टम डिज़ाइन में उपयोग किए गए प्रमुख इंजीनियरिंग मानदंड"
    : "Key engineering parameters used in system design and sizing";

  // Computed metrics
  const systemKwp = summary.systemKw;
  const panelWatt = 540;
  const panelCount = summary.panels;
  const dcCapacityKwp = (panelCount * panelWatt) / 1000;
  const dcAcRatio = dcCapacityKwp > 0 ? (dcCapacityKwp / systemKwp).toFixed(2) : "—";
  const yieldHours = systemKwp > 0 ? Math.round((summary.annualGen / systemKwp) * 10) / 10 : 0;
  const capacityFactor = Math.round((summary.annualGen / (systemKwp * 8760)) * 100 * 10) / 10;
  const performanceRatio = 78; // typical India on-grid PR
  const panelEfficiency = Math.round((panelWatt / 1.96) / 10) / 10; // ~21.4% for 540W on ~1.96m²

  const engMetrics = [
    {
      label: isHi ? "DC कैपेसिटी (STC)" : "DC Capacity (STC)",
      value: `${dcCapacityKwp.toFixed(1)} kWp`,
    },
    {
      label: isHi ? "AC कैपेसिटी" : "AC Capacity (inverter)",
      value: `${systemKwp} kW`,
    },
    {
      label: isHi ? "DC/AC अनुपात" : "DC/AC Ratio",
      value: dcAcRatio,
    },
    {
      label: isHi ? "पीक सन आवर्स (भारत औसत)" : "Peak Sun Hours (India avg)",
      value: "5.0 hrs/day",
    },
    {
      label: isHi ? "परफॉर्मेंस रेशियो" : "Performance Ratio",
      value: `${performanceRatio}%`,
    },
    {
      label: isHi ? "क्षमता कारक" : "Capacity Factor",
      value: `${capacityFactor}%`,
    },
    {
      label: isHi ? "विशिष्ट उत्पादन" : "Specific Yield",
      value: `${yieldHours} kWh/kWp/yr`,
    },
    {
      label: isHi ? "पैनल दक्षता" : "Panel Efficiency",
      value: `~${panelEfficiency}%`,
    },
  ];

  const certifications = [
    isHi ? "BIS / IEC 61215 पैनल प्रमाण" : "BIS / IEC 61215 certified panels",
    isHi ? "MNRE-ALMM सूची में शामिल ब्रांड" : "MNRE-ALMM listed brands",
    isHi ? "IEC 62109 इन्वर्टर प्रमाण" : "IEC 62109 certified inverter",
    isHi ? "IS/IEC 62446 कमीशनिंग टेस्ट" : "IS/IEC 62446 commissioning test",
    isHi ? "25 वर्ष लीनियर पावर वारंटी" : "25-year linear power output warranty",
    isHi ? "10 वर्ष प्रोडक्ट वारंटी" : "10-year product warranty on panels",
  ];

  const steps = isHi
    ? [
        { step: "1", label: "साइट सर्वे", sub: "शेडिंग / लोड विश्लेषण" },
        { step: "2", label: "सिस्टम डिज़ाइन", sub: "PVsyst / SketchUp" },
        { step: "3", label: "स्थापना", sub: "सर्टिफाइड टेक्नीशियन" },
        { step: "4", label: "नेट-मीटरिंग", sub: "DISCOM आवेदन" },
        { step: "5", label: "कमीशनिंग", sub: "लाइव टेस्ट + रिपोर्ट" },
      ]
    : [
        { step: "1", label: "Site Survey", sub: "Shading / load analysis" },
        { step: "2", label: "System Design", sub: "PVsyst / SketchUp" },
        { step: "3", label: "Installation", sub: "Certified technicians" },
        { step: "4", label: "Net-Metering", sub: "DISCOM application" },
        { step: "5", label: "Commissioning", sub: "Live test + report" },
      ];

  return (
    <ProposalJourneySection id="engineering-rationale">
      <BlockSectionTitle kicker={kicker} title={title} subtitle={subtitle} dark={dark} lang={lang} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Engineering parameters */}
        <BlockPanel dark={dark}>
          <div className="mb-4 flex items-center gap-2">
            <Gauge className={`h-4 w-4 ${dark ? "text-sky-400" : "text-sky-600"}`} />
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>
              {isHi ? "इंजीनियरिंग मानदंड" : "Engineering Parameters"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {engMetrics.map((m) => (
              <BlockMetricRow key={m.label} label={m.label} value={m.value} />
            ))}
          </div>
        </BlockPanel>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Certifications */}
          <BlockPanel dark={dark}>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className={`h-4 w-4 ${dark ? "text-emerald-400" : "text-emerald-600"}`} />
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>
                {isHi ? "प्रमाण-पत्र एवं वारंटी" : "Certifications & Warranty"}
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {certifications.map((c, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-start gap-2 text-xs ${dark ? "text-slate-300" : "text-slate-700"}`}
                >
                  <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${dark ? "bg-emerald-400" : "bg-emerald-500"}`} />
                  {c}
                </motion.li>
              ))}
            </ul>
          </BlockPanel>

          {/* Installation workflow */}
          <BlockPanel dark={dark}>
            <div className="mb-3 flex items-center gap-2">
              <Zap className={`h-4 w-4 ${dark ? "text-amber-400" : "text-amber-600"}`} />
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>
                {isHi ? "स्थापना प्रक्रिया" : "Installation Workflow"}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {steps.map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                    dark ? "bg-white/5" : "bg-slate-50"
                  }`}
                >
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    dark ? "bg-sky-500/30 text-sky-300" : "bg-sky-100 text-sky-700"
                  }`}>
                    {s.step}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${dark ? "text-slate-200" : "text-slate-800"}`}>{s.label}</p>
                    <p className={`text-[10px] ${dark ? "text-slate-500" : "text-slate-500"}`}>{s.sub}</p>
                  </div>
                  {i < steps.length - 1 ? (
                    <Sun className={`ml-auto h-3 w-3 flex-shrink-0 ${dark ? "text-slate-600" : "text-slate-300"}`} />
                  ) : (
                    <ShieldCheck className={`ml-auto h-3.5 w-3.5 flex-shrink-0 ${dark ? "text-emerald-400" : "text-emerald-600"}`} />
                  )}
                </motion.div>
              ))}
            </div>
          </BlockPanel>
        </div>
      </div>
    </ProposalJourneySection>
  );
}
