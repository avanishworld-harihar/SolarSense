"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { BlockRenderContext } from "@/lib/proposal-block-context";
import { resolveScenarioMetrics } from "@/lib/commercial-capacity-scenarios";
import { buildDefaultScenarios } from "@/lib/commercial-capacity-scenarios";
import { BlockPanel, BlockSectionTitle } from "@/components/proposal/blocks/proposal-block-utils";
import { ProposalJourneySection } from "@/components/proposal/proposal-journey";

type Props = Pick<BlockRenderContext, "summary" | "lang" | "darkMode" | "commercialConfig">;

const inr = (v: number) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`;

export function BlockCapacityScenarios({ summary, lang, darkMode, commercialConfig }: Props) {
  const isHi = lang === "hi";
  const dark = darkMode;
  const cfg = commercialConfig?.capacityScenarios;
  if (cfg?.enabled === false) return null;

  const scenarios =
    cfg?.scenarios?.length && cfg.scenarios.length > 0
      ? cfg.scenarios
      : buildDefaultScenarios(summary.systemKw);
  const recommendedId = cfg?.recommendedId ?? scenarios.find((s) => s.isRecommended)?.id ?? "primary";
  const moduleWatt = commercialConfig?.panel?.watt ?? 540;
  const metrics = resolveScenarioMetrics(summary, scenarios, moduleWatt);

  return (
    <ProposalJourneySection id="capacity-scenarios">
      <BlockSectionTitle
        kicker={isHi ? "क्षमता विकल्प" : "Capacity Options"}
        title={isHi ? "प्लांट क्षमता परिदृश्य" : "Plant Capacity Scenarios"}
        subtitle={
          isHi
            ? "अनुशंसित विकल्प के साथ वैकल्पिक kW विकल्प"
            : "Alternative kW options alongside our recommended sizing"
        }
        dark={dark}
        lang={lang}
      />

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="grid gap-3 lg:grid-cols-3"
      >
        {metrics.map((m, i) => {
          const isRec = m.id === recommendedId || m.isRecommended;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <BlockPanel
                dark={dark}
                className={
                  isRec
                    ? dark
                      ? "ring-1 ring-amber-500/50"
                      : "ring-2 ring-amber-400/60"
                    : ""
                }
              >
                <motion.div className="mb-3 flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                    {m.label}
                  </span>
                  {isRec && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      <Star className="h-3 w-3" />
                      {isHi ? "अनुशंसित" : "Recommended"}
                    </span>
                  )}
                </motion.div>
                <p className={`text-3xl font-bold tabular-nums ${dark ? "text-white" : "text-slate-900"}`}>
                  {m.systemKw} kW
                </p>
                <dl className={`mt-4 space-y-2 text-xs ${dark ? "text-slate-300" : "text-slate-600"}`}>
                  <Row label={isHi ? "शुद्ध निवेश" : "Net investment"} value={inr(m.netCostInr)} />
                  <Row label={isHi ? "वार्षिक उत्पादन" : "Annual generation"} value={`${m.annualGenKwh.toLocaleString("en-IN")} kWh`} />
                  <Row label={isHi ? "वार्षिक बचत" : "Annual saving"} value={inr(m.annualSavingInr)} />
                  <Row label={isHi ? "पेबैक" : "Payback"} value={`${m.paybackYears} yr`} />
                  <Row label={isHi ? "छत क्षेत्र (अनु.)" : "Roof area (est.)"} value={`~${m.roofAreaSqmApprox} m²`} />
                </dl>
              </BlockPanel>
            </motion.div>
          );
        })}
      </motion.div>
    </ProposalJourneySection>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="opacity-70">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

