"use client";

/**
 * BlockCommercialEngineering — premium engineering rationale for commercial proposals.
 *
 * Technical design basis section. Executive decision-makers and technical approvers
 * both read this section. Must carry:
 *   - DC/AC ratio, performance ratio, specific yield, capacity factor
 *   - System design methodology (PVsyst-aligned parameters)
 *   - Standards compliance matrix
 *   - Panel + inverter specifications
 *   - 5-stage installation process
 */

import { motion } from "framer-motion";
import { Gauge, ShieldCheck, Cpu } from "lucide-react";
import type { CommercialCtx } from "@/components/proposal/commercial-proposal-view";

function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{num}</span>
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-600">{label}</span>
    </div>
  );
}

function MetricRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-slate-100 py-2 last:border-0 ${highlight ? "font-semibold" : ""}`}>
      <span className="text-xs text-slate-600">{label}</span>
      <span className={`text-xs tabular-nums ${highlight ? "text-sky-700" : "text-slate-800"}`}>{value}</span>
    </div>
  );
}

type Props = { ctx: CommercialCtx };

export function BlockCommercialEngineering({ ctx }: Props) {
  const {
    summary,
    dcCapacityKwp,
    dcAcRatio,
    capacityFactor,
    specificYield,
    performanceRatio,
    lang,
  } = ctx;
  const isHi = lang === "hi";

  const panelWp = 540;
  const panelEfficiency = Math.round((panelWp / (2.1 * 1000)) * 100 * 10) / 10; // ~540W / 2.1 m²

  const designParams = [
    { label: "DC Capacity (STC)", value: `${dcCapacityKwp.toFixed(2)} kWp`, highlight: true },
    { label: "AC Capacity (inverter rated)", value: `${summary.systemKw} kW` },
    { label: "DC/AC Ratio", value: `${dcAcRatio}` },
    { label: "Peak Sun Hours (India avg)", value: "5.0 hrs/day" },
    { label: "Performance Ratio (PR)", value: `${performanceRatio}%` },
    { label: "Capacity Factor (CF)", value: `${capacityFactor}%` },
    { label: "Specific Yield", value: `${specificYield} kWh/kWp/yr`, highlight: true },
    { label: "Annual Generation", value: `${(summary.annualGen / 1000).toFixed(1)} MWh/yr` },
    { label: "Panel Efficiency (STC)", value: `~${panelEfficiency}%` },
    { label: "Module Wattage", value: `${panelWp} Wp per panel` },
    { label: "Panel Count", value: `${summary.panels} nos` },
    { label: "Load Coverage", value: `${Math.round(summary.coverage)}%` },
  ];

  const standards = [
    "IEC 61215 / BIS certified PV modules",
    "MNRE-ALMM listed panel brand",
    "IEC 62109 certified string inverter",
    "IS 13947 / IEC 60947 switchgear",
    "IS/IEC 62446 commissioning test",
    "IS 732 electrical installation wiring",
    "CEA Safety Regulations 2010",
    "Net-metering per SERC regulations",
  ];

  const installSteps = isHi
    ? [
        { num: "01", phase: "साइट सर्वे", detail: "छाया विश्लेषण · लोड प्रोफाइल · स्ट्रक्चर आकलन" },
        { num: "02", phase: "सिस्टम डिज़ाइन", detail: "PVsyst सिमुलेशन · SLD ड्रॉइंग · स्ट्रक्चर डिज़ाइन" },
        { num: "03", phase: "सामग्री खरीद", detail: "ALMM पैनल · सर्टिफाइड इन्वर्टर · BOS सामग्री" },
        { num: "04", phase: "स्थापना", detail: "सर्टिफाइड इंजीनियर · सुरक्षित वायरिंग · ग्रिड कनेक्शन" },
        { num: "05", phase: "परीक्षण", detail: "IV कर्व · इन्सुलेशन टेस्ट · कमीशनिंग रिपोर्ट" },
        { num: "06", phase: "नेट-मीटरिंग", detail: "DISCOM आवेदन · मीटर स्थापना · ग्रिड निर्यात" },
      ]
    : [
        { num: "01", phase: "Site Survey", detail: "Shading analysis · Load profiling · Structural assessment" },
        { num: "02", phase: "System Design", detail: "PVsyst simulation · SLD drawing · Structural design" },
        { num: "03", phase: "Procurement", detail: "ALMM-listed panels · Certified inverter · BOS materials" },
        { num: "04", phase: "Installation", detail: "Certified engineers · Safe wiring · Grid interconnect" },
        { num: "05", phase: "Testing & Commissioning", detail: "IV curve · Insulation test · Commissioning report" },
        { num: "06", phase: "Net-Metering", detail: "DISCOM application · Meter installation · Grid export" },
      ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <SectionLabel num="04" label={isHi ? "इंजीनियरिंग आधार" : "Engineering Rationale"} />

      <div className="mb-3">
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
          {isHi ? "तकनीकी डिज़ाइन आधार" : "Technical Design Basis"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isHi
            ? "सिस्टम डिज़ाइन में उपयोग की गई प्रमुख इंजीनियरिंग मापदंड"
            : "Key engineering parameters governing system sizing, layout, and performance estimates"}
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Design parameters */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <Gauge className="h-4 w-4 text-sky-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {isHi ? "सिस्टम डिज़ाइन मापदंड" : "System Design Parameters"}
              </p>
            </div>
            <div className="grid gap-x-8 px-5 py-4 sm:grid-cols-2">
              {designParams.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.025 }}
                >
                  <MetricRow label={m.label} value={m.value} highlight={m.highlight} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Standards & certifications */}
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {isHi ? "मानक एवं प्रमाण" : "Standards & Compliance"}
              </p>
            </div>
            <ul className="flex flex-col gap-2 px-5 py-4">
              {standards.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-2 text-xs text-slate-700"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  {s}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Installation workflow */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <Cpu className="h-4 w-4 text-indigo-500" />
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
            {isHi ? "स्थापना एवं कमीशनिंग प्रक्रिया" : "Installation & Commissioning Process"}
          </p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {installSteps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                {s.num}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">{s.phase}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{s.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
