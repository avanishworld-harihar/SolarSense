"use client";

import { motion } from "framer-motion";
import { Award, Scale, Sparkles, TrendingUp, Zap } from "lucide-react";
import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import { buildDcrComparison, getPanelCatalogEntry } from "@/lib/commercial-panel-catalog";
import type { ProposalDeckSummary } from "@/lib/proposal-ppt";
import { cn } from "@/lib/utils";

const inr = (v: number) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`;

type Props = {
  systemKw: number;
  summary: ProposalDeckSummary;
  config: CommercialProposalConfig;
};

export function WorkspaceDcrComparisonEngine({ systemKw, summary, config }: Props) {
  const reg = config.panelRegistry;
  const dcrId = reg?.selectedDcrCatalogId ?? "waaree-540-dcr";
  const nonId = reg?.selectedNonDcrCatalogId ?? "waaree-540-non-dcr";
  const dcrEntry = getPanelCatalogEntry(dcrId);
  const nonEntry = getPanelCatalogEntry(nonId);
  const brandId = dcrEntry?.brandId ?? config.dcrComparison?.brandId ?? "waaree";
  const watt = dcrEntry?.watt ?? config.panel?.watt ?? 540;

  const dcrRate =
    reg?.overrides?.[dcrId]?.ratePerWpInr ?? config.panel?.ratePerWpInr ?? dcrEntry?.ratePerWpInr;
  const nonRate = reg?.overrides?.[nonId]?.ratePerWpInr ?? nonEntry?.ratePerWpInr;

  const cmp = buildDcrComparison(systemKw, brandId, watt, dcrRate, nonRate);
  if (!cmp) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
        Select matching DCR and Non-DCR modules (same brand & watt) in the registries above to
        generate the plant comparison.
      </div>
    );
  }

  const genDcr = Math.round(cmp.dcr.systemKw * 1450);
  const genNon = Math.round(cmp.nonDcr.systemKw * 1450);
  const genDelta = genDcr - genNon;
  const paybackDcr =
    summary.annualSaving > 0
      ? Math.round((cmp.dcr.hardwareInr / summary.annualSaving) * 10) / 10
      : summary.paybackYears;
  const paybackNon =
    summary.annualSaving > 0
      ? Math.round((cmp.nonDcr.hardwareInr / summary.annualSaving) * 10) / 10
      : summary.paybackYears;
  const recommendDcr = cmp.deltaInr <= summary.pmSubsidy * 0.5;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-indigo-600">
            <Scale className="h-3.5 w-3.5" />
            DCR vs Non-DCR plant comparison
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {Math.round(systemKw)} kW DCR vs {Math.round(systemKw)} kW Non-DCR
          </p>
          <p className="text-xs text-slate-500">
            {dcrEntry?.brandLabel} {watt}W — executive cost & subsidy intelligence
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl border px-3 py-2 text-center",
            recommendDcr
              ? "border-emerald-200 bg-emerald-50"
              : "border-sky-200 bg-sky-50"
          )}
        >
          <p className="text-[10px] font-bold uppercase text-slate-500">Recommendation</p>
          <p className="text-sm font-bold text-slate-900">
            {recommendDcr ? "DCR / ALMM path" : "Non-DCR value path"}
          </p>
        </div>
      </motion.div>

      <motion.div className="grid gap-3 lg:grid-cols-2">
        <PlantCard
          title="DCR / ALMM plant"
          accent="emerald"
          hardware={cmp.dcr.hardwareInr}
          rate={cmp.dcr.ratePerWpInr}
          modules={cmp.dcr.moduleCount}
          generation={genDcr}
          payback={paybackDcr}
          badge="Subsidy eligible"
          highlight
        />
        <PlantCard
          title="Non-DCR plant"
          accent="slate"
          hardware={cmp.nonDcr.hardwareInr}
          rate={cmp.nonDcr.ratePerWpInr}
          modules={cmp.nonDcr.moduleCount}
          generation={genNon}
          payback={paybackNon}
          badge="Lower module rate"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-white/60 bg-gradient-to-br from-slate-900 to-indigo-950 p-4 text-white shadow-lg backdrop-blur-md"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <DeltaTile
            label="Plant cost delta"
            value={inr(cmp.deltaInr)}
            sub={`${cmp.deltaPct > 0 ? "+" : ""}${cmp.deltaPct}% vs Non-DCR`}
            icon={TrendingUp}
          />
          <DeltaTile
            label="Generation delta"
            value={`${genDelta >= 0 ? "+" : ""}${genDelta.toLocaleString("en-IN")} kWh/yr`}
            sub="At same kW — module count may differ"
            icon={Zap}
          />
          <DeltaTile
            label="Subsidy relevance"
            value={dcrEntry?.subsidyEligible ? "ALMM / PM Surya" : "Verify norms"}
            sub={cmp.subsidyNote}
            icon={Award}
          />
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs leading-relaxed text-slate-200">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          {recommendDcr
            ? "DCR premium is modest relative to subsidy upside — position ALMM-listed modules for institutional buyers and hotel groups seeking green certification."
            : "Non-DCR delivers lower upfront hardware — ideal when subsidy timelines are uncertain or CAPEX must be minimized."}
        </p>
      </motion.div>
    </div>
  );
}

function PlantCard({
  title,
  accent,
  hardware,
  rate,
  modules,
  generation,
  payback,
  badge,
  highlight,
}: {
  title: string;
  accent: "emerald" | "slate";
  hardware: number;
  rate: number;
  modules: number;
  generation: number;
  payback: number;
  badge: string;
  highlight?: boolean;
}) {
  const border = accent === "emerald" ? "border-emerald-200/80" : "border-slate-200/80";
  const bg =
    accent === "emerald"
      ? "bg-gradient-to-br from-emerald-50/90 to-white/80"
      : "bg-gradient-to-br from-slate-50/90 to-white/80";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm backdrop-blur-md",
        border,
        bg,
        highlight && "ring-2 ring-emerald-400/40"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-600">
          {badge}
        </span>
      </div>
      <p className="text-2xl font-extrabold tabular-nums text-slate-900">{inr(hardware)}</p>
      <p className="text-[11px] text-slate-500">Module hardware @ {rate}/Wp</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Modules" value={String(modules)} />
        <MiniStat label="Gen/yr" value={`${(generation / 1000).toFixed(1)}k`} />
        <MiniStat label="Payback" value={`${payback}y`} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-1 py-1.5">
      <p className="text-[9px] font-semibold uppercase text-slate-400">{label}</p>
      <p className="text-xs font-bold text-slate-800">{value}</p>
    </div>
  );
}

function DeltaTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-base font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{sub}</p>
    </div>
  );
}
