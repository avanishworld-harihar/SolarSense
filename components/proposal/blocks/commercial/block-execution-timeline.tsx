"use client";

/**
 * BlockExecutionTimeline — project execution timeline for commercial proposals.
 *
 * 6-phase Gantt-style timeline:
 *   Phase 1: Site Survey & Design  (Week 1–2)
 *   Phase 2: Procurement           (Week 2–4)
 *   Phase 3: Civil & Structure     (Week 4–6)
 *   Phase 4: Installation          (Week 5–8)
 *   Phase 5: Testing & Commissioning (Week 8–9)
 *   Phase 6: Net-Metering & Handover (Week 9–10)
 *
 * Plus: Key milestone markers and responsibilities matrix
 */

import { motion } from "framer-motion";
import { Calendar, CheckCircle2 } from "lucide-react";
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

type Phase = {
  num: string;
  phase: string;
  phaseHi?: string;
  startWeek: number;
  endWeek: number;
  activities: string[];
  activitiesHi?: string[];
  milestone: string;
  milestoneHi?: string;
  color: string;
  responsibility: "EPC" | "CLIENT" | "SHARED" | "DISCOM";
};

const TOTAL_WEEKS = 11;

const colorMap: Record<string, { bar: string; badge: string; text: string }> = {
  sky: { bar: "bg-sky-500", badge: "bg-sky-100 text-sky-700 border-sky-300", text: "text-sky-700" },
  indigo: { bar: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700 border-indigo-300", text: "text-indigo-700" },
  violet: { bar: "bg-violet-500", badge: "bg-violet-100 text-violet-700 border-violet-300", text: "text-violet-700" },
  amber: { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-300", text: "text-amber-700" },
  emerald: { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-300", text: "text-emerald-700" },
  rose: { bar: "bg-rose-500", badge: "bg-rose-100 text-rose-700 border-rose-300", text: "text-rose-700" },
};

const respBadge: Record<string, string> = {
  EPC: "bg-sky-100 text-sky-700 border border-sky-200",
  CLIENT: "bg-violet-100 text-violet-700 border border-violet-200",
  SHARED: "bg-amber-100 text-amber-700 border border-amber-200",
  DISCOM: "bg-slate-100 text-slate-700 border border-slate-200",
};

type Props = { ctx: CommercialCtx };

export function BlockExecutionTimeline({ ctx }: Props) {
  const { summary, lang } = ctx;
  const isHi = lang === "hi";

  // Scale weeks by system size — larger systems take longer
  const baseWeeks = summary.systemKw <= 50 ? 10 : summary.systemKw <= 200 ? 14 : 20;
  const scale = baseWeeks / 10; // 1.0x for ≤50 kW, 1.4x for ≤200 kW, 2.0x for >200 kW

  const phases: Phase[] = [
    {
      num: "01",
      phase: "Site Survey & Design",
      phaseHi: "साइट सर्वे एवं डिज़ाइन",
      startWeek: 1,
      endWeek: Math.round(2 * scale),
      activities: [
        "Shadow & tilt analysis",
        "Load profiling & tariff study",
        "PVsyst / SketchUp modelling",
        "SLD + structural drawing",
      ],
      activitiesHi: [
        "छाया एवं झुकाव विश्लेषण",
        "लोड प्रोफाइलिंग एवं टैरिफ अध्ययन",
        "PVsyst / SketchUp मॉडलिंग",
        "SLD + स्ट्रक्चरल ड्रॉइंग",
      ],
      milestone: "Design approved",
      milestoneHi: "डिज़ाइन स्वीकृत",
      color: "sky",
      responsibility: "EPC",
    },
    {
      num: "02",
      phase: "Material Procurement",
      phaseHi: "सामग्री खरीद",
      startWeek: Math.round(2 * scale),
      endWeek: Math.round(4 * scale),
      activities: [
        "PO to panel & inverter vendors",
        "BOS items sourcing",
        "Logistics to site",
      ],
      activitiesHi: [
        "पैनल एवं इन्वर्टर PO जारी",
        "BOS आइटम सोर्सिंग",
        "साइट तक परिवहन",
      ],
      milestone: "Materials at site",
      milestoneHi: "सामग्री साइट पर",
      color: "indigo",
      responsibility: "EPC",
    },
    {
      num: "03",
      phase: "Civil & Structure",
      phaseHi: "सिविल एवं स्ट्रक्चर",
      startWeek: Math.round(3.5 * scale),
      endWeek: Math.round(6 * scale),
      activities: [
        "Structural foundation",
        "Module mounting structure erection",
        "Cable trays & conduit",
      ],
      activitiesHi: [
        "स्ट्रक्चरल फाउंडेशन",
        "माउंटिंग स्ट्रक्चर स्थापना",
        "केबल ट्रे एवं कंड्यूट",
      ],
      milestone: "Structure complete",
      milestoneHi: "स्ट्रक्चर पूर्ण",
      color: "violet",
      responsibility: "EPC",
    },
    {
      num: "04",
      phase: "Electrical Installation",
      phaseHi: "विद्युत स्थापना",
      startWeek: Math.round(5 * scale),
      endWeek: Math.round(8 * scale),
      activities: [
        "Panel mounting & wiring",
        "DCDB / ACDB installation",
        "Inverter & earthing",
        "AC interconnection",
      ],
      activitiesHi: [
        "पैनल माउंटिंग एवं वायरिंग",
        "DCDB / ACDB स्थापना",
        "इन्वर्टर एवं अर्थिंग",
        "AC इंटरकनेक्शन",
      ],
      milestone: "Pre-commissioning ready",
      milestoneHi: "प्री-कमीशनिंग तैयार",
      color: "amber",
      responsibility: "EPC",
    },
    {
      num: "05",
      phase: "Testing & Commissioning",
      phaseHi: "परीक्षण एवं कमीशनिंग",
      startWeek: Math.round(8 * scale),
      endWeek: Math.round(9 * scale),
      activities: [
        "IV curve test",
        "Insulation resistance test",
        "System energisation",
        "IS/IEC 62446 commissioning report",
      ],
      activitiesHi: [
        "IV कर्व परीक्षण",
        "इन्सुलेशन रेजिस्टेंस परीक्षण",
        "सिस्टम एनर्जाइज़ेशन",
        "कमीशनिंग रिपोर्ट",
      ],
      milestone: "System live",
      milestoneHi: "सिस्टम चालू",
      color: "emerald",
      responsibility: "EPC",
    },
    {
      num: "06",
      phase: "Net-Metering & Handover",
      phaseHi: "नेट-मीटरिंग एवं हैंडओवर",
      startWeek: Math.round(8 * scale),
      endWeek: Math.round(10 * scale),
      activities: [
        "DISCOM NEM application",
        "Meter inspection & approval",
        "Training — customer team",
        "Document handover",
      ],
      activitiesHi: [
        "DISCOM NEM आवेदन",
        "मीटर निरीक्षण एवं स्वीकृति",
        "ग्राहक टीम प्रशिक्षण",
        "दस्तावेज़ हैंडओवर",
      ],
      milestone: "Project closed",
      milestoneHi: "परियोजना पूर्ण",
      color: "rose",
      responsibility: "SHARED",
    },
  ];

  const totalWeeksDisplay = Math.round(10 * scale);
  const weekNumbers = Array.from({ length: totalWeeksDisplay }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <SectionLabel num="07" label={isHi ? "परियोजना समयरेखा" : "Execution Timeline"} />

      <div className="mb-3">
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
          {isHi ? "परियोजना कार्यान्वयन समयरेखा" : "Project Execution Timeline"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isHi
            ? `अनुमानित ${totalWeeksDisplay}-सप्ताह की कार्य योजना — ${summary.systemKw} kW सिस्टम`
            : `Estimated ${totalWeeksDisplay}-week project plan for ${summary.systemKw} kW on-grid system`}
        </p>
      </div>

      {/* Gantt chart */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="min-w-[640px] p-5">
          {/* Week header */}
          <div className="mb-3 flex">
            <div className="w-44 flex-shrink-0 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
              {isHi ? "चरण" : "Phase"}
            </div>
            <div className="flex flex-1 gap-0">
              {weekNumbers.map((w) => (
                <div
                  key={w}
                  className="flex-1 text-center text-[9px] font-bold text-slate-400"
                  style={{ minWidth: "20px" }}
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="w-28 flex-shrink-0 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
              {isHi ? "जिम्मेदारी" : "By"}
            </div>
          </div>

          {/* Phase rows */}
          {phases.map((phase, i) => {
            const c = colorMap[phase.color];
            const left = ((phase.startWeek - 1) / totalWeeksDisplay) * 100;
            const width = ((phase.endWeek - phase.startWeek) / totalWeeksDisplay) * 100;
            const phaseLabel = isHi && phase.phaseHi ? phase.phaseHi : phase.phase;
            return (
              <motion.div
                key={phase.num}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="mb-2 flex items-center"
              >
                <div className="w-44 flex-shrink-0 pr-3">
                  <p className="text-xs font-semibold text-slate-700">{phaseLabel}</p>
                  <p className={`text-[9px] ${c.text}`}>
                    Wk {phase.startWeek}–{phase.endWeek}
                  </p>
                </div>
                <div className="relative flex-1" style={{ height: "24px" }}>
                  {/* Background track */}
                  <div className="absolute inset-0 rounded-sm bg-slate-100" />
                  {/* Phase bar */}
                  <div
                    className={`absolute top-1 h-[16px] rounded-sm ${c.bar} opacity-85`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                </div>
                <div className="w-28 flex-shrink-0 pl-3 text-right">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${respBadge[phase.responsibility]}`}>
                    {phase.responsibility}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Milestones + activities */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {phases.map((phase, i) => {
          const c = colorMap[phase.color];
          const phaseLabel = isHi && phase.phaseHi ? phase.phaseHi : phase.phase;
          const milestoneLabel = isHi && phase.milestoneHi ? phase.milestoneHi : phase.milestone;
          const activities = isHi && phase.activitiesHi ? phase.activitiesHi : phase.activities;
          return (
            <motion.div
              key={phase.num}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${c.bar} text-[10px] font-bold text-white`}>
                  {phase.num}
                </div>
                <p className="text-xs font-semibold text-slate-800">{phaseLabel}</p>
              </div>
              <ul className="mb-3 flex flex-col gap-1">
                {activities.map((a, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                    <span className={`mt-1.5 h-1 w-1 flex-shrink-0 rounded-full ${c.bar}`} />
                    {a}
                  </li>
                ))}
              </ul>
              <div className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${c.badge} border text-[10px]`}>
                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                <span className="font-semibold">{milestoneLabel}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Timeline footer note */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-4">
        <Calendar className="h-4 w-4 flex-shrink-0 text-slate-400" />
        <p className="text-[11px] text-slate-500">
          {isHi
            ? `* समयरेखा ${summary.systemKw} kW सिस्टम के लिए अनुमानित है। साइट की स्थिति, DISCOM अनुमोदन, और मानसून अवधि के अनुसार परिवर्तन हो सकता है।`
            : `* Timeline is indicative for a ${summary.systemKw} kW system. Actual schedule subject to site conditions, DISCOM approval timelines, and monsoon constraints. Work order date taken as Week 1.`}
        </p>
      </div>
    </div>
  );
}
