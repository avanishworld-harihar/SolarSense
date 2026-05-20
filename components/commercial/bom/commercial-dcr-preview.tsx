"use client";

import { buildDcrCompareFromSolar } from "@/lib/commercial-solar-engine";
import type { CommercialSolarPanels } from "@/lib/commercial-solar-schema";
import { cn } from "@/lib/utils";
import { Scale } from "lucide-react";

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

export function CommercialDcrPreview({ solar }: { solar: CommercialSolarPanels }) {
  const cmp = buildDcrCompareFromSolar(solar);
  if (!cmp) return null;

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-4 dark:border-amber-500/25 dark:from-amber-950/20 dark:to-[#0c1017]">
      <div className="mb-3 flex items-center gap-2">
        <Scale className="h-4 w-4 text-amber-600" />
        <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Live DCR vs Non-DCR comparison</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CompareChip
          title="DCR (primary)"
          hardware={cmp.dcr.hardwareInr}
          rate={cmp.dcr.ratePerWpInr}
          modules={cmp.dcr.moduleCount}
          accent="emerald"
        />
        <CompareChip
          title="Non-DCR (primary)"
          hardware={cmp.nonDcr.hardwareInr}
          rate={cmp.nonDcr.ratePerWpInr}
          modules={cmp.nonDcr.moduleCount}
          accent="slate"
        />
      </div>
      <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-400">
        Panel hardware delta: <strong className="text-slate-900 dark:text-slate-100">{inr(cmp.deltaInr)}</strong> (
        {cmp.deltaPct > 0 ? "+" : ""}
        {cmp.deltaPct}% vs Non-DCR)
      </p>
    </div>
  );
}

function CompareChip({
  title,
  hardware,
  rate,
  modules,
  accent,
}: {
  title: string;
  hardware: number;
  rate: number;
  modules: number;
  accent: "emerald" | "slate";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        accent === "emerald"
          ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-950/20"
          : "border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]"
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{inr(hardware)}</p>
      <p className="text-[11px] text-slate-500">
        ₹{rate}/Wp · {modules} modules
      </p>
    </div>
  );
}
