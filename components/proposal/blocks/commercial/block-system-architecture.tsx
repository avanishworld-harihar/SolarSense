"use client";

/**
 * BlockSystemArchitecture — system component architecture for commercial proposals.
 *
 * Visual CSS-based system diagram:
 *   DC Strings → DCDB/SPD → String Inverter → ACDB/SPD → Net Meter → Grid
 *
 * Plus:
 *   - Component specification table (panels, inverter, structure, earthing)
 *   - Protection & safety provisions
 *   - Monitoring interface
 */

import { motion } from "framer-motion";
import { ArrowRight, Cpu, Shield, Wifi } from "lucide-react";
import type { CommercialCtx } from "@/components/proposal/commercial-proposal-view";
import { CommercialSectionHeader, GlassPanel, SectionReveal } from "./commercial-shared";

type ArchNode = {
  id: string;
  label: string;
  sub: string;
  color: "sky" | "amber" | "violet" | "emerald" | "slate";
};

const colorMap: Record<string, { bg: string; border: string; text: string; sub: string }> = {
  sky: { bg: "bg-sky-50", border: "border-sky-300", text: "text-sky-800", sub: "text-sky-600" },
  amber: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", sub: "text-amber-600" },
  violet: { bg: "bg-violet-50", border: "border-violet-300", text: "text-violet-800", sub: "text-violet-600" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800", sub: "text-emerald-600" },
  slate: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-800", sub: "text-slate-600" },
};

type Props = { ctx: CommercialCtx };

export function BlockSystemArchitecture({ ctx }: Props) {
  const { summary, dcCapacityKwp, dcAcRatio, lang } = ctx;
  const isHi = lang === "hi";

  const stringsCount = Math.ceil(summary.panels / 14); // ~14 panels per string (typical for 540W)
  const panelWp = 540;
  const panelVoc = 49.5; // typical 540W monopepi Voc
  const stringsInverter = Math.ceil(stringsCount / 2);

  const archNodes: ArchNode[] = [
    {
      id: "panels",
      label: isHi ? "सौर पैनल" : "PV Array",
      sub: isHi
        ? `${summary.panels} पैनल × ${panelWp} Wp`
        : `${summary.panels} × ${panelWp} Wp · ${stringsCount} strings`,
      color: "sky",
    },
    {
      id: "dcdb",
      label: "DCDB / SPD",
      sub: isHi ? "DC डिस्ट्रीब्यूशन बॉक्स + सर्ज प्रोटेक्शन" : `DC dist. box · surge protection`,
      color: "amber",
    },
    {
      id: "inverter",
      label: isHi ? "इन्वर्टर" : "String Inverter",
      sub: isHi
        ? `${summary.systemKw} kW · Grid-tie`
        : `${summary.systemKw} kW · DC/AC ${dcAcRatio} · IP65`,
      color: "violet",
    },
    {
      id: "acdb",
      label: "ACDB / SPD",
      sub: isHi ? "AC डिस्ट्रीब्यूशन बॉक्स + MCB + RCCB" : "AC dist. box · MCB · RCCB · SPD",
      color: "amber",
    },
    {
      id: "meter",
      label: isHi ? "नेट मीटर" : "Net Meter",
      sub: isHi ? "DISCOM बाइडायरेक्शनल मीटर" : "DISCOM bi-directional smart meter",
      color: "emerald",
    },
    {
      id: "grid",
      label: isHi ? "ग्रिड" : "Grid (DISCOM)",
      sub: isHi ? "एक्सपोर्ट + आयात" : "export excess · import deficit",
      color: "slate",
    },
  ];

  const componentSpecs = [
    {
      component: isHi ? "सौर पैनल" : "Solar PV Modules",
      spec: `${panelWp} Wp Mono PERC Half-cut`,
      brand: summary.brands.panel || "Tier-1 ALMM-listed",
      qty: `${summary.panels} nos`,
      warranty: "25 yr linear power",
    },
    {
      component: isHi ? "स्ट्रिंग इन्वर्टर" : "String Inverter",
      spec: `${summary.systemKw} kW Grid-Tie, IP65`,
      brand: summary.brands.inverter || "IEC-62109 certified",
      qty: `${stringsInverter > 1 ? stringsInverter : 1} nos`,
      warranty: "5 yr standard",
    },
    {
      component: isHi ? "माउंटिंग स्ट्रक्चर" : "Mounting Structure",
      spec: "Hot-dip galvanised MS, wind-load engineered",
      brand: "IS 2062 steel",
      qty: `${summary.systemKw} kW capacity`,
      warranty: "10 yr structural",
    },
    {
      component: "DCDB / ACDB",
      spec: "IP54 weatherproof, SPD + MCB + Isolator",
      brand: "Havells / Schneider / Legrand",
      qty: "1 set each",
      warranty: "1 yr product",
    },
    {
      component: isHi ? "DC केबल" : "DC Cables",
      spec: "4 mm² / 6 mm² Solar DC (TÜV-certified)",
      brand: "Havells / Polycab",
      qty: `Per layout design`,
      warranty: "25 yr UV rating",
    },
    {
      component: isHi ? "अर्थिंग सिस्टम" : "Earthing System",
      spec: "IS 3043 — 4-electrode GI pipe earthing",
      brand: "Copper-bonded / GI",
      qty: "As per design",
      warranty: "Lifetime",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:px-12 md:py-24">
      <CommercialSectionHeader
        num="05"
        label={isHi ? "सिस्टम आर्किटेक्चर" : "System Architecture"}
        title={isHi ? "सिस्टम कंपोनेंट आर्किटेक्चर" : "System Component Architecture"}
        subtitle={
          isHi
            ? "DC स्ट्रिंग से ग्रिड तक — सिंगल-लाइन डायग्राम सारांश"
            : "DC string to grid — single-line diagram overview with component specifications"
        }
      />

      {/* Architecture flow diagram */}
      <SectionReveal>
        <GlassPanel className="p-5">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          {isHi ? "सिस्टम ब्लॉक डायग्राम" : "System Block Diagram (Simplified SLD)"}
        </p>
        <div className="flex flex-wrap items-center justify-start gap-1">
          {archNodes.map((node, i) => {
            const c = colorMap[node.color];
            return (
              <div key={node.id} className="flex items-center gap-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className={`rounded-lg border-2 px-3 py-2 text-center ${c.bg} ${c.border}`}
                  style={{ minWidth: "6.5rem" }}
                >
                  <p className={`text-xs font-bold ${c.text}`}>{node.label}</p>
                  <p className={`mt-0.5 text-[9px] leading-snug ${c.sub}`}>{node.sub}</p>
                </motion.div>
                {i < archNodes.length - 1 && (
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                )}
              </div>
            );
          })}
        </div>

        {/* DC/AC annotations */}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="h-2 w-6 rounded-sm bg-amber-400" />
            {isHi ? "DC सर्किट" : "DC circuit (≤ 1000 V)"}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="h-2 w-6 rounded-sm bg-emerald-400" />
            {isHi ? "AC सर्किट" : "AC circuit (230/415 V)"}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="h-2 w-6 rounded-sm bg-slate-400" />
            {isHi ? "ग्रिड कनेक्शन" : "Grid tie (DISCOM metering)"}
          </span>
        </div>
        </GlassPanel>
      </SectionReveal>

      {/* Component specifications table */}
      <SectionReveal className="mt-6" delay={0.08}>
        <GlassPanel>
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <Cpu className="h-4 w-4 text-indigo-500" />
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
            {isHi ? "कंपोनेंट विशिष्टताएं" : "Component Specifications"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-2.5 text-left">{isHi ? "कंपोनेंट" : "Component"}</th>
                <th className="px-5 py-2.5 text-left">{isHi ? "विशिष्टता" : "Specification"}</th>
                <th className="px-5 py-2.5 text-left">{isHi ? "ब्रांड / मानक" : "Brand / Standard"}</th>
                <th className="px-5 py-2.5 text-right">{isHi ? "मात्रा" : "Qty"}</th>
                <th className="px-5 py-2.5 text-right">{isHi ? "वारंटी" : "Warranty"}</th>
              </tr>
            </thead>
            <tbody>
              {componentSpecs.map((row, i) => (
                <motion.tr
                  key={row.component}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                >
                  <td className="px-5 py-2.5 font-semibold text-slate-800">{row.component}</td>
                  <td className="px-5 py-2.5 text-slate-600">{row.spec}</td>
                  <td className="px-5 py-2.5 text-slate-500">{row.brand}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-slate-700">{row.qty}</td>
                  <td className="px-5 py-2.5 text-right text-emerald-700">{row.warranty}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        </GlassPanel>
      </SectionReveal>

      {/* Protection & monitoring row */}
      <SectionReveal className="mt-6 grid gap-5 sm:grid-cols-2" delay={0.12}>
        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-rose-500" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              {isHi ? "सुरक्षा प्रावधान" : "Protection Provisions"}
            </p>
          </div>
          <ul className="flex flex-col gap-1.5 text-xs text-slate-700">
            {[
              isHi ? "DC सर्किट ब्रेकर + DC फ्यूज" : "DC circuit breakers + fuses (per string)",
              isHi ? "टाइप 2 SPD — DC + AC दोनों" : "Type-2 surge protection — DC & AC side",
              isHi ? "RCCB + RCBO — AC इंस्टालेशन" : "RCCB + RCBO for AC installation",
              isHi ? "इन्सुलेशन मॉनिटरिंग रिले" : "Insulation monitoring relay (IMR)",
              isHi ? "IS 3043 — 4-पॉइंट अर्थिंग" : "IS 3043 compliant 4-electrode earthing",
              isHi ? "एंटी-आइलैंडिंग — CEA अनुपालन" : "Anti-islanding protection per CEA",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-400" />
                {item}
              </li>
            ))}
          </ul>
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Wifi className="h-4 w-4 text-sky-500" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              {isHi ? "मॉनिटरिंग एवं नियंत्रण" : "Monitoring & Control"}
            </p>
          </div>
          <ul className="flex flex-col gap-1.5 text-xs text-slate-700">
            {[
              isHi ? "इन्वर्टर Wi-Fi / LAN क्लाउड पोर्टल" : "Inverter cloud portal via Wi-Fi / LAN",
              isHi ? "वास्तविक समय उत्पादन ट्रैकिंग" : "Real-time generation + consumption tracking",
              isHi ? "स्ट्रिंग-लेवल प्रदर्शन डेटा" : "String-level performance data",
              isHi ? "अलार्म + SMS/Email अलर्ट" : "Fault alarm + SMS / email alerts",
              isHi ? "मोबाइल ऐप — iOS + Android" : "Mobile app — iOS & Android",
              isHi ? "मासिक प्रदर्शन रिपोर्ट" : "Monthly performance report (PDF)",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                {item}
              </li>
            ))}
          </ul>
        </GlassPanel>
      </SectionReveal>
    </div>
  );
}
