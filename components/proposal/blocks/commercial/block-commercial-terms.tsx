"use client";

/**
 * BlockCommercialTerms — commercial terms for EPC solar proposals.
 *
 * Sections:
 *   1. Payment schedule (milestone-based)
 *   2. Warranty matrix (panels, inverter, structure, workmanship)
 *   3. Key commercial terms (scope, exclusions, validity)
 *   4. DISCOM application process (net-metering steps)
 */

import { motion } from "framer-motion";
import { ClipboardList, FileCheck, IndianRupee, Scale } from "lucide-react";
import type { CommercialCtx } from "@/components/proposal/commercial-proposal-view";
import { CommercialSectionHeader, GlassPanel, SectionReveal } from "./commercial-shared";

const fmtL = (v: number) => {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)} k`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};

type Props = { ctx: CommercialCtx };

export function BlockCommercialTerms({ ctx }: Props) {
  const { summary, lang, installer } = ctx;
  const isHi = lang === "hi";

  const totalCost = summary.netCost;

  const paymentMilestones = summary.paymentMilestones?.length
    ? summary.paymentMilestones
    : [
        { label: isHi ? "कार्य आदेश / अग्रिम" : "Work Order / Advance", pct: 30 },
        { label: isHi ? "सामग्री वितरण पर" : "On Material Delivery", pct: 30 },
        { label: isHi ? "स्थापना पूर्ण होने पर" : "On Installation Completion", pct: 30 },
        { label: isHi ? "DISCOM कमीशनिंग पर" : "On DISCOM Commissioning", pct: 10 },
      ].map((m) => ({
        label: m.label,
        pct: m.pct,
        amount: Math.round((m.pct / 100) * totalCost),
      }));

  const warrantyMatrix = [
    {
      item: isHi ? "सौर पैनल — उत्पाद" : "Solar PV Modules — Product",
      duration: "10 years",
      by: isHi ? "निर्माता" : "Manufacturer",
      coverage: isHi ? "विनिर्माण दोष" : "Manufacturing defects",
    },
    {
      item: isHi ? "सौर पैनल — पावर आउटपुट" : "Solar PV Modules — Power Output",
      duration: "25 years",
      by: isHi ? "निर्माता" : "Manufacturer",
      coverage: isHi ? "रैखिक क्षरण ≤ 0.45%/वर्ष" : "Linear degradation ≤ 0.45%/yr",
    },
    {
      item: isHi ? "स्ट्रिंग इन्वर्टर" : "String Inverter",
      duration: "5 years",
      by: isHi ? "निर्माता" : "Manufacturer",
      coverage: isHi ? "उत्पाद वारंटी" : "Standard product warranty",
    },
    {
      item: isHi ? "माउंटिंग स्ट्रक्चर" : "Mounting Structure",
      duration: "10 years",
      by: isHi ? "EPC / निर्माता" : "EPC / Fabricator",
      coverage: isHi ? "जंग एवं संरचनात्मक अखंडता" : "Corrosion & structural integrity",
    },
    {
      item: isHi ? "विद्युत कार्य (वायरिंग)" : "Electrical Workmanship",
      duration: "2 years",
      by: "EPC",
      coverage: isHi ? "स्थापना कार्य गारंटी" : "Installation workmanship guarantee",
    },
    {
      item: isHi ? "निगरानी प्रणाली" : "Monitoring System",
      duration: "2 years",
      by: isHi ? "OEM / EPC" : "OEM / EPC",
      coverage: isHi ? "हार्डवेयर एवं सॉफ्टवेयर" : "Hardware & software",
    },
  ];

  const scopeIncludes = isHi
    ? [
        "सभी EPC आपूर्ति एवं स्थापना कार्य",
        "DISCOM NEM आवेदन सहायता",
        "IS/IEC 62446 कमीशनिंग परीक्षण",
        "क्लाउड मॉनिटरिंग पोर्टल सक्रियण",
        "ऑपरेशन एवं रखरखाव प्रशिक्षण",
        "प्रथम वर्ष AMC (निःशुल्क)",
      ]
    : [
        "All EPC supply and installation works",
        "DISCOM NEM application & liaison support",
        "IS/IEC 62446 commissioning test report",
        "Cloud monitoring portal activation",
        "Operations & maintenance training",
        "First-year AMC (complimentary)",
      ];

  const scopeExcludes = isHi
    ? [
        "DISCOM मीटर लागत (DISCOM द्वारा)",
        "आंतरिक भार पुनर्संरेखन",
        "सिविल निर्माण (छत संरचना)",
        "बिजली कनेक्शन बढ़ाना",
        "PMC सब्सिडी / सरकारी प्रोत्साहन",
      ]
    : [
        "DISCOM net meter cost (DISCOM-owned)",
        "Internal load re-cabling / DB upgrade",
        "Roof waterproofing / civil repairs",
        "Electricity connection augmentation",
        "PM Surya Ghar subsidy processing",
      ];

  const keyTerms = isHi
    ? [
        { term: "उद्धरण वैधता", value: "30 दिन (जारी तारीख से)" },
        { term: "भुगतान शर्तें", value: "माइलस्टोन-आधारित (ऊपर देखें)" },
        { term: "परियोजना पूर्णता", value: `${summary.systemKw <= 50 ? 10 : 14} सप्ताह (WO से)` },
        { term: "मूल्य आधार", value: "वर्तमान GST + माल भाड़ा सहित" },
        { term: "GST", value: "12% (सौर ऊर्जा उपकरण पर)" },
        { term: "विवाद निपटारा", value: "भारतीय मध्यस्थता अधिनियम 1996" },
      ]
    : [
        { term: "Quotation Validity", value: "30 days from date of issue" },
        { term: "Payment Terms", value: "Milestone-based (see above)" },
        { term: "Project Completion", value: `${summary.systemKw <= 50 ? "10 weeks" : "14 weeks"} from WO` },
        { term: "Price Basis", value: "Inclusive of current GST + freight" },
        { term: "GST Rate", value: "12% (solar energy equipment)" },
        { term: "Dispute Resolution", value: "Arbitration Act 1996, India" },
      ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:px-12 md:py-24">
      <CommercialSectionHeader
        num="09"
        label={isHi ? "व्यावसायिक शर्तें" : "Commercial Terms"}
        title={isHi ? "व्यावसायिक एवं कानूनी शर्तें" : "Commercial & Contractual Terms"}
        subtitle={
          isHi
            ? "भुगतान अनुसूची, वारंटी मैट्रिक्स, दायरा एवं मुख्य व्यावसायिक शर्तें"
            : "Payment schedule, warranty matrix, EPC scope, and key commercial terms"
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Payment schedule */}
        <SectionReveal>
          <GlassPanel>
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <IndianRupee className="h-4 w-4 text-sky-500" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              {isHi ? "भुगतान अनुसूची" : "Payment Schedule"}
            </p>
          </div>
          <div className="p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">{isHi ? "कुल परियोजना मूल्य" : "Total Project Value"}</span>
              <span className="text-lg font-bold tabular-nums text-slate-900">{fmtL(totalCost)}</span>
            </div>
            <div className="space-y-2">
              {paymentMilestones.map((m, i) => {
                const pct = "pct" in m ? (m as { label: string; pct: number; amount?: number }).pct : 0;
                const amount = "amount" in m ? (m as { amount?: number }).amount ?? 0 : Math.round((pct / 100) * totalCost);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
                          {i + 1}
                        </div>
                        <span className="text-xs font-medium text-slate-700">{m.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold tabular-nums text-slate-900">{fmtL(amount)}</span>
                        <span className="ml-1.5 text-[10px] text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 + 0.2 }}
                        className="h-full rounded-full bg-sky-500"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          </GlassPanel>
        </SectionReveal>

        {/* Key terms + scope */}
        <SectionReveal className="flex flex-col gap-4" delay={0.08}>
          {/* Key commercial terms */}
          <GlassPanel>
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <Scale className="h-4 w-4 text-indigo-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {isHi ? "मुख्य शर्तें" : "Key Commercial Terms"}
              </p>
            </div>
            <div className="px-5 py-3">
              {keyTerms.map((t, i) => (
                <div
                  key={i}
                  className="flex items-baseline justify-between border-b border-slate-100 py-2 last:border-0"
                >
                  <span className="text-xs text-slate-500">{t.term}</span>
                  <span className="ml-4 text-right text-xs font-semibold text-slate-800">{t.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scope matrix */}
          <GlassPanel>
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <ClipboardList className="h-4 w-4 text-emerald-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {isHi ? "EPC दायरा" : "EPC Scope Summary"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 p-5">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                  {isHi ? "शामिल है" : "Includes"}
                </p>
                <ul className="space-y-1.5">
                  {scopeIncludes.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-700">
                  {isHi ? "शामिल नहीं" : "Excludes"}
                </p>
                <ul className="space-y-1.5">
                  {scopeExcludes.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-500">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </GlassPanel>
          </GlassPanel>
        </SectionReveal>
      </div>

      {/* Warranty matrix */}
      <SectionReveal className="mt-6" delay={0.12}>
        <GlassPanel>
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <FileCheck className="h-4 w-4 text-violet-500" />
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
            {isHi ? "वारंटी मैट्रिक्स" : "Warranty Matrix"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-2.5 text-left">{isHi ? "घटक" : "Component"}</th>
                <th className="px-5 py-2.5 text-center">{isHi ? "अवधि" : "Duration"}</th>
                <th className="px-5 py-2.5 text-left">{isHi ? "जिम्मेदार" : "Warrantor"}</th>
                <th className="px-5 py-2.5 text-left">{isHi ? "कवरेज" : "Coverage"}</th>
              </tr>
            </thead>
            <tbody>
              {warrantyMatrix.map((row, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className={`border-b border-slate-100 ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}
                >
                  <td className="px-5 py-2.5 font-medium text-slate-800">{row.item}</td>
                  <td className="px-5 py-2.5 text-center font-semibold text-emerald-700">{row.duration}</td>
                  <td className="px-5 py-2.5 text-slate-600">{row.by}</td>
                  <td className="px-5 py-2.5 text-slate-500">{row.coverage}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-2.5 text-[10px] text-slate-400">
          {isHi
            ? `* वारंटी दावे के लिए ${installer.name} से संपर्क करें। सभी वारंटी नियमित रखरखाव की शर्त पर लागू हैं।`
            : `* Contact ${installer.name} for warranty claims. All warranties subject to normal maintenance and use conditions.`}
        </p>
        </GlassPanel>
      </SectionReveal>
    </div>
  );
}
