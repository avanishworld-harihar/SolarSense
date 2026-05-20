"use client";

import { motion } from "framer-motion";
import { Scale } from "lucide-react";
import type { BlockRenderContext } from "@/lib/proposal-block-context";
import { buildDcrComparison } from "@/lib/commercial-panel-catalog";
import { buildDcrCompareFromSolar } from "@/lib/commercial-solar-engine";
import { BlockPanel, BlockSectionTitle } from "@/components/proposal/blocks/proposal-block-utils";
import { ProposalJourneySection } from "@/components/proposal/proposal-journey";

type Props = Pick<BlockRenderContext, "summary" | "lang" | "darkMode" | "commercialConfig">;

const inr = (v: number) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`;

export function BlockDcrComparison({ summary, lang, darkMode, commercialConfig }: Props) {
  const isHi = lang === "hi";
  const dark = darkMode;
  const cfg = commercialConfig?.dcrComparison;
  if (cfg?.enabled === false) return null;

  const solarCmp = commercialConfig?.solarPanels
    ? buildDcrCompareFromSolar(commercialConfig.solarPanels)
    : null;

  const brandId = cfg?.brandId ?? commercialConfig?.panel?.brandId ?? "waaree";
  const watt = cfg?.watt ?? commercialConfig?.panel?.watt ?? 540;
  const reg = commercialConfig?.panelRegistry;
  const dcrId = reg?.selectedDcrCatalogId;
  const nonId = reg?.selectedNonDcrCatalogId;
  const dcrRate = dcrId ? reg?.overrides?.[dcrId]?.ratePerWpInr : commercialConfig?.panel?.ratePerWpInr;
  const nonRate = nonId ? reg?.overrides?.[nonId]?.ratePerWpInr : undefined;
  const catalogCmp = buildDcrComparison(summary.systemKw, brandId, watt, dcrRate, nonRate);

  const cmp = solarCmp
    ? {
        dcr: {
          entry: { brandLabel: solarCmp.dcr.row.brand },
          hardwareInr: solarCmp.dcr.hardwareInr,
          ratePerWpInr: solarCmp.dcr.ratePerWpInr,
          moduleCount: solarCmp.dcr.moduleCount,
        },
        nonDcr: {
          entry: { brandLabel: solarCmp.nonDcr.row.brand },
          hardwareInr: solarCmp.nonDcr.hardwareInr,
          ratePerWpInr: solarCmp.nonDcr.ratePerWpInr,
          moduleCount: solarCmp.nonDcr.moduleCount,
        },
        deltaInr: solarCmp.deltaInr,
        deltaPct: solarCmp.deltaPct,
        subsidyNote: catalogCmp?.subsidyNote ?? "",
      }
    : catalogCmp;

  if (!cmp) return null;

  const brandLabel =
    solarCmp?.dcr.row.brand ?? cmp.dcr.entry.brandLabel;

  return (
    <ProposalJourneySection id="dcr-comparison">
      <BlockSectionTitle
        kicker={isHi ? "DCR तुलना" : "DCR Comparison"}
        title={isHi ? "DCR बनाम Non-DCR — लागत प्रभाव" : "DCR vs Non-DCR — Cost Impact"}
        subtitle={
          isHi
            ? `${brandLabel} ${watt}W — सब्सिडी और ALMM प्रभाव सहित`
            : `${brandLabel} ${watt}W modules — subsidy & ALMM impact included`
        }
        dark={dark}
        lang={lang}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <CompareCard
          title="DCR / ALMM"
          subtitle={isHi ? "उच्च सब्सिडी संभावना" : "Higher subsidy potential"}
          hardware={cmp.dcr.hardwareInr}
          rate={cmp.dcr.ratePerWpInr}
          modules={cmp.dcr.moduleCount}
          accent="emerald"
          dark={dark}
          highlight
        />
        <CompareCard
          title="Non-DCR"
          subtitle={isHi ? "निचला मॉड्यूल दर" : "Lower module rate"}
          hardware={cmp.nonDcr.hardwareInr}
          rate={cmp.nonDcr.ratePerWpInr}
          modules={cmp.nonDcr.moduleCount}
          accent="slate"
          dark={dark}
        />
      </motion.div>

      <BlockPanel dark={dark} className="mt-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.02 }}>
            <Scale className={`h-5 w-5 ${dark ? "text-amber-400" : "text-amber-600"}`} />
            <div>
              <p className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                {isHi ? "DCR प्रीमियम" : "DCR premium"}
              </p>
              <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                {inr(cmp.deltaInr)} ({cmp.deltaPct > 0 ? "+" : ""}
                {cmp.deltaPct}%) {isHi ? "अधिक पैनल लागत" : "panel hardware vs Non-DCR"}
              </p>
            </div>
          </motion.div>
          <p className={`max-w-md text-xs leading-relaxed ${dark ? "text-slate-400" : "text-slate-600"}`}>
            {cmp.subsidyNote}
          </p>
        </motion.div>
      </BlockPanel>
    </ProposalJourneySection>
  );
}

function CompareCard({
  title,
  subtitle,
  hardware,
  rate,
  modules,
  accent,
  dark,
  highlight,
}: {
  title: string;
  subtitle: string;
  hardware: number;
  rate: number;
  modules: number;
  accent: "emerald" | "slate";
  dark: boolean;
  highlight?: boolean;
}) {
  const border =
    highlight && accent === "emerald"
      ? dark
        ? "border-emerald-500/40 bg-emerald-950/20"
        : "border-emerald-200 bg-emerald-50/50"
      : dark
      ? "border-white/10 bg-white/5"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${border}`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${dark ? "text-slate-400" : "text-slate-500"}`}>
        {title}
      </p>
      <p className={`mt-0.5 text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>{subtitle}</p>
      <p className={`mt-3 text-2xl font-bold tabular-nums ${dark ? "text-white" : "text-slate-900"}`}>
        {inr(hardware)}
      </p>
      <p className={`mt-1 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
        ₹{rate}/Wp · {modules} modules
      </p>
    </div>
  );
}
