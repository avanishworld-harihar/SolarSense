"use client";

import { DgHybridDiagram } from "@/components/proposal/blocks/commercial/dg-hybrid-diagram";
import { DgOperationScenarios } from "@/components/proposal/blocks/commercial/dg-operation-scenarios";
import { BlockPanel, BlockSectionTitle, BlockStatTile } from "@/components/proposal/blocks/proposal-block-utils";
import { ProposalJourneySection } from "@/components/proposal/proposal-journey";
import type { BlockRenderContext } from "@/lib/proposal-block-context";
import { computeDgHybridAnalysis } from "@/lib/dg-hybrid-engine";
import { motion } from "framer-motion";
import { Leaf, Shield, TrendingDown, Zap } from "lucide-react";

type Props = Pick<BlockRenderContext, "summary" | "lang" | "darkMode" | "commercialConfig">;

const inr = (v: number) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`;

export function BlockDgHybrid({ summary, lang, darkMode, commercialConfig }: Props) {
  const isHi = lang === "hi";
  const dark = darkMode;
  const dg = commercialConfig?.dgAssumptions;
  if (dg?.enabled !== true) return null;

  const analysis = computeDgHybridAnalysis(dg, summary.systemKw);

  return (
    <ProposalJourneySection id="dg-hybrid-analysis">
      <BlockSectionTitle
        kicker={isHi ? "हाइब्रिड इंजीनियरिंग" : "Hybrid intelligence"}
        title={isHi ? "सोलर + DG हाइब्रिड सिस्टम" : "Solar + DG Hybrid System"}
        subtitle={
          isHi
            ? "डीज़ल बैकअप, सोलर ऑफसेट और क्रिटिकल लोड प्रोटेक्शन — एकीकृत प्रस्ताव"
            : "Engineering-grade backup architecture with solar priority, fuel savings, and critical-load resilience"
        }
        dark={dark}
        lang={lang}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BlockStatTile
          label={isHi ? "डीज़ल बचत / माह" : "Diesel savings / mo"}
          value={inr(analysis.monthlyFuelSavingsInr)}
          rawValue={analysis.monthlyFuelSavingsInr}
          tone="green"
          dark={dark}
          lang={lang}
        />
        <BlockStatTile
          label={isHi ? "DG रनटाइम कट" : "DG runtime cut"}
          value={`−${analysis.runtimeReductionPct}%`}
          tone="amber"
          dark={dark}
          lang={lang}
        />
        <BlockStatTile
          label={isHi ? "CO₂ कमी / वर्ष" : "CO₂ reduced / yr"}
          value={`${analysis.co2TonnesSavedPerYear} t`}
          tone="green"
          dark={dark}
          lang={lang}
        />
        <BlockStatTile
          label={isHi ? "रिलायबिलिटी" : "Backup score"}
          value={`${analysis.reliabilityScore}%`}
          tone="blue"
          dark={dark}
          lang={lang}
        />
      </div>

      {dg.showArchitectureDiagram !== false ? (
        <DgHybridDiagram
          systemKw={summary.systemKw}
          capacityKva={analysis.capacityKva}
          className="mb-6"
        />
      ) : null}

      {dg.showOperationScenarios !== false ? (
        <BlockPanel dark={dark} className="mb-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            {isHi ? "संचालन परिदृश्य" : "Operation scenarios"}
          </p>
          <DgOperationScenarios systemKw={summary.systemKw} />
        </BlockPanel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <ComparisonCard
          icon={TrendingDown}
          title={isHi ? "ईंधन लागत" : "Fuel cost trajectory"}
          before={inr(analysis.monthlyFuelCostBeforeInr)}
          after={inr(analysis.monthlyFuelCostAfterInr)}
          delta={`−${inr(analysis.monthlyFuelSavingsInr)}/mo`}
          dark={dark}
        />
        <ComparisonCard
          icon={Zap}
          title={isHi ? "वार्षिक DG घंटे" : "Annual DG runtime"}
          before={`${analysis.annualRuntimeHoursBefore.toLocaleString("en-IN")} h`}
          after={`${analysis.annualRuntimeHoursAfter.toLocaleString("en-IN")} h`}
          delta={`−${analysis.runtimeReductionPct}%`}
          dark={dark}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-6 grid gap-3 sm:grid-cols-3"
      >
        {[
          {
            icon: Shield,
            title: isHi ? "क्रिटिकल लोड" : "Critical load cover",
            text: `${analysis.criticalLoadKw} kW priority circuits with hybrid ATS`,
          },
          {
            icon: Leaf,
            title: isHi ? "पर्यावरण" : "Environmental",
            text: `${analysis.co2TonnesSavedPerYear} tonnes CO₂ avoided annually`,
          },
          {
            icon: Zap,
            title: isHi ? "सोलर ऑफसेट" : "Solar offset",
            text: `${analysis.solarOffsetPct}% of peak met by on-site PV first`,
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <item.icon className="mb-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
            <p className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-400">{item.text}</p>
          </div>
        ))}
      </motion.div>

      <p className="mt-4 text-center text-[11px] text-slate-500 dark:text-slate-400">
        {isHi
          ? `वार्षिक ईंधन बचत अनुमान: ${inr(analysis.annualFuelSavingsInr)} · ${analysis.capacityKva} kVA ${analysis.fuelType} DG`
          : `Annual fuel savings estimate: ${inr(analysis.annualFuelSavingsInr)} · ${analysis.capacityKva} kVA ${analysis.fuelType} genset`}
      </p>
    </ProposalJourneySection>
  );
}

function ComparisonCard({
  icon: Icon,
  title,
  before,
  after,
  delta,
  dark,
}: {
  icon: React.ElementType;
  title: string;
  before: string;
  after: string;
  delta: string;
  dark: boolean;
}) {
  return (
    <BlockPanel dark={dark}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</p>
      </div>
      <div className="flex items-end justify-between gap-2 text-sm">
        <div>
          <p className="text-[10px] uppercase text-slate-500">Before solar</p>
          <p className="font-bold tabular-nums text-rose-600 line-through decoration-rose-300">{before}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-slate-500">With hybrid</p>
          <p className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{after}</p>
        </div>
      </div>
      <p className="mt-2 text-center text-xs font-bold text-emerald-600">{delta}</p>
    </BlockPanel>
  );
}
