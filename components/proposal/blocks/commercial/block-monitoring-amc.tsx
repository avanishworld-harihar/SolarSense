"use client";

/**
 * BlockMonitoringAMC — monitoring system + annual maintenance contract.
 *
 * Three-panel section:
 *   1. Smart monitoring features (cloud portal, real-time data, alerts)
 *   2. AMC tier comparison table (1yr / 5yr / 10yr)
 *   3. SLA commitments (response time, resolution time, uptime guarantee)
 */

import { motion } from "framer-motion";
import { Activity, CheckCircle2, ShieldCheck, Wifi, XCircle } from "lucide-react";
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

const fmtL = (v: number) => {
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)} k`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};

type Props = { ctx: CommercialCtx };

export function BlockMonitoringAMC({ ctx }: Props) {
  const { summary, lang } = ctx;
  const isHi = lang === "hi";

  const monitoringFeatures = isHi
    ? [
        { title: "रियल-टाइम उत्पादन", detail: "मिनट-दर-मिनट kW उत्पादन एवं kWh ऊर्जा ट्रैकिंग" },
        { title: "स्ट्रिंग-लेवल डेटा", detail: "प्रत्येक PV स्ट्रिंग की प्रदर्शन निगरानी" },
        { title: "ग्रिड एक्सपोर्ट/इंपोर्ट", detail: "नेट-मीटर डेटा के साथ बिजली खपत विश्लेषण" },
        { title: "अलार्म एवं अलर्ट", detail: "SMS/Email — फॉल्ट, लो प्रोडक्शन, ग्रिड त्रुटि" },
        { title: "मोबाइल ऐप", detail: "iOS एवं Android — लाइव डैशबोर्ड" },
        { title: "मासिक प्रदर्शन रिपोर्ट", detail: "PDF रिपोर्ट — उत्पादन, बचत, CO₂ डेटा" },
        { title: "ऐतिहासिक डेटा", detail: "5+ वर्ष ऐतिहासिक डेटा स्टोरेज" },
        { title: "इन्वर्टर डायग्नोस्टिक्स", detail: "रिमोट फर्मवेयर अपडेट एवं डायग्नोस्टिक्स" },
      ]
    : [
        { title: "Real-Time Generation", detail: "Minute-level kW output & kWh energy tracking" },
        { title: "String-Level Monitoring", detail: "Per-string performance & mismatch detection" },
        { title: "Grid Export / Import", detail: "Net-meter data + consumption analysis" },
        { title: "Fault Alarms & Alerts", detail: "SMS / email — fault, low production, grid error" },
        { title: "Mobile App", detail: "iOS & Android — live dashboard & history" },
        { title: "Monthly Performance Report", detail: "PDF report — generation, saving, CO₂ data" },
        { title: "Historical Data", detail: "5+ year historical data storage on cloud" },
        { title: "Remote Diagnostics", detail: "Remote firmware update & inverter diagnostics" },
      ];

  // AMC pricing (rough industry estimates based on system kW)
  const amcBase = Math.round(summary.systemKw * 400); // ₹400/kW/yr
  const amcOptions = [
    {
      tier: "1 Year",
      tierHi: "1 वर्ष",
      price: 0,
      priceNote: isHi ? "प्रथम वर्ष — निःशुल्क" : "First year — complimentary",
      features: [
        { label: isHi ? "वार्षिक निरीक्षण विज़िट" : "Annual inspection visit", included: true },
        { label: isHi ? "पैनल सफाई (1 बार)" : "Panel cleaning (1 visit)", included: true },
        { label: isHi ? "इन्वर्टर फर्मवेयर अपडेट" : "Inverter firmware update", included: true },
        { label: isHi ? "टर्मिनल सत्यापन" : "Terminal tightening check", included: true },
        { label: isHi ? "प्रदर्शन रिपोर्ट" : "Performance report", included: true },
        { label: isHi ? "पैनल सफाई (त्रैमासिक)" : "Quarterly panel cleaning", included: false },
        { label: isHi ? "स्पेयर पार्ट्स कवर" : "Spare parts coverage", included: false },
      ],
    },
    {
      tier: "5 Year",
      tierHi: "5 वर्ष",
      price: amcBase * 5 * 0.85,
      priceNote: isHi ? "15% छूट — 5 वर्षीय पैकेज" : "15% discount — 5-year package",
      features: [
        { label: isHi ? "वार्षिक निरीक्षण विज़िट" : "Annual inspection visit", included: true },
        { label: isHi ? "पैनल सफाई (2 बार/वर्ष)" : "Panel cleaning (2× / yr)", included: true },
        { label: isHi ? "इन्वर्टर फर्मवेयर अपडेट" : "Inverter firmware update", included: true },
        { label: isHi ? "टर्मिनल सत्यापन" : "Terminal tightening check", included: true },
        { label: isHi ? "प्रदर्शन रिपोर्ट" : "Performance report", included: true },
        { label: isHi ? "पैनल सफाई (त्रैमासिक)" : "Quarterly panel cleaning", included: true },
        { label: isHi ? "स्पेयर पार्ट्स कवर" : "Spare parts coverage", included: false },
      ],
    },
    {
      tier: "10 Year",
      tierHi: "10 वर्ष",
      price: amcBase * 10 * 0.75,
      priceNote: isHi ? "25% छूट — 10 वर्षीय पैकेज" : "25% discount — 10-year package",
      features: [
        { label: isHi ? "वार्षिक निरीक्षण विज़िट" : "Annual inspection visit", included: true },
        { label: isHi ? "पैनल सफाई (2 बार/वर्ष)" : "Panel cleaning (2× / yr)", included: true },
        { label: isHi ? "इन्वर्टर फर्मवेयर अपडेट" : "Inverter firmware update", included: true },
        { label: isHi ? "टर्मिनल सत्यापन" : "Terminal tightening check", included: true },
        { label: isHi ? "प्रदर्शन रिपोर्ट" : "Performance report", included: true },
        { label: isHi ? "पैनल सफाई (त्रैमासिक)" : "Quarterly panel cleaning", included: true },
        { label: isHi ? "स्पेयर पार्ट्स कवर" : "Spare parts coverage", included: true },
      ],
    },
  ];

  const slaRows = isHi
    ? [
        { metric: "प्रतिक्रिया समय (दूरस्थ)", standard: "4 कार्य घंटे", premium: "2 कार्य घंटे" },
        { metric: "साइट विज़िट (फॉल्ट)", standard: "48 घंटे", premium: "24 घंटे" },
        { metric: "इन्वर्टर डाउनटाइम", standard: "72 घंटे अधिकतम", premium: "48 घंटे अधिकतम" },
        { metric: "सिस्टम अपटाइम गारंटी", standard: "≥ 95%", premium: "≥ 98%" },
        { metric: "वार्षिक सेवा विज़िट", standard: "1 बार", premium: "2 बार" },
        { metric: "रिपोर्ट डिलीवरी", standard: "मासिक", premium: "साप्ताहिक + मासिक" },
      ]
    : [
        { metric: "Response Time (remote)", standard: "4 business hrs", premium: "2 business hrs" },
        { metric: "On-site Visit (fault)", standard: "48 hrs", premium: "24 hrs" },
        { metric: "Inverter Downtime Cap", standard: "72 hrs max", premium: "48 hrs max" },
        { metric: "System Uptime Guarantee", standard: "≥ 95%", premium: "≥ 98%" },
        { metric: "Annual Service Visits", standard: "1 per year", premium: "2 per year" },
        { metric: "Report Delivery", standard: "Monthly", premium: "Weekly + Monthly" },
      ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <SectionLabel num="08" label={isHi ? "मॉनिटरिंग एवं रखरखाव" : "Monitoring & AMC"} />

      <div className="mb-3">
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
          {isHi ? "स्मार्ट मॉनिटरिंग एवं वार्षिक रखरखाव" : "Smart Monitoring & Annual Maintenance"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isHi
            ? "24×7 रियल-टाइम डेटा, सक्रिय फॉल्ट मैनेजमेंट, और दीर्घकालिक प्रदर्शन गारंटी"
            : "24×7 real-time data, proactive fault management, and long-term performance assurance"}
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Monitoring features grid */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <Wifi className="h-4 w-4 text-sky-500" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              {isHi ? "स्मार्ट मॉनिटरिंग क्षमताएं" : "Smart Monitoring Capabilities"}
            </p>
          </div>
          <div className="grid gap-0 p-1">
            {monitoringFeatures.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 rounded-lg px-4 py-2.5 hover:bg-slate-50"
              >
                <Activity className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-sky-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{f.title}</p>
                  <p className="text-[10px] text-slate-500">{f.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* SLA table */}
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {isHi ? "सेवा स्तर प्रतिबद्धता (SLA)" : "Service Level Commitments (SLA)"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-2.5 text-left">{isHi ? "मानदंड" : "Metric"}</th>
                    <th className="px-4 py-2.5 text-center">{isHi ? "मानक" : "Standard"}</th>
                    <th className="px-4 py-2.5 text-center">{isHi ? "प्रीमियम" : "Premium"}</th>
                  </tr>
                </thead>
                <tbody>
                  {slaRows.map((row, i) => (
                    <tr key={i} className={`border-b border-slate-100 ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                      <td className="px-4 py-2 text-slate-700">{row.metric}</td>
                      <td className="px-4 py-2 text-center text-slate-500">{row.standard}</td>
                      <td className="px-4 py-2 text-center font-semibold text-emerald-700">{row.premium}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* AMC tiers */}
      <div className="mt-5">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          {isHi ? "वार्षिक रखरखाव अनुबंध — योजना तुलना" : "Annual Maintenance Contract — Plan Comparison"}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {amcOptions.map((opt, i) => {
            const isPopular = i === 1;
            const tierLabel = isHi && opt.tierHi ? opt.tierHi : opt.tier;
            return (
              <motion.div
                key={opt.tier}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className={`rounded-xl border-2 bg-white p-5 ${
                  isPopular ? "border-sky-400 shadow-md" : "border-slate-200 shadow-sm"
                }`}
              >
                {isPopular && (
                  <div className="mb-2 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-700">
                    {isHi ? "अनुशंसित" : "Recommended"}
                  </div>
                )}
                <p className="text-lg font-bold text-slate-900">{tierLabel}</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-sky-700">
                  {opt.price === 0 ? (isHi ? "निःशुल्क" : "Complimentary") : fmtL(opt.price)}
                </p>
                <p className="mb-4 text-[10px] text-slate-500">{opt.priceNote}</p>
                <ul className="flex flex-col gap-2">
                  {opt.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs">
                      {f.included ? (
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                      )}
                      <span className={f.included ? "text-slate-700" : "text-slate-400"}>{f.label}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
