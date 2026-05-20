"use client";

import { Button } from "@/components/ui/button";
import { FloatingLabelNumericInput } from "@/components/ui/floating-label-input";
import { DgHybridConfigPanel } from "@/components/commercial/dg-hybrid-config-panel";
import { CommercialExecutionTimeline } from "@/components/commercial/bom/commercial-execution-timeline";
import { computeDgHybridAnalysis } from "@/lib/dg-hybrid-engine";
import { WorkspaceCapacityScenariosModule } from "@/components/workspace/commercial/workspace-capacity-scenarios-module";
import { defaultExecutionTimeline } from "@/lib/commercial-solar-schema";
import { buildDcrCompareFromSolar } from "@/lib/commercial-solar-engine";
import { buildCommercialEmiTable, selectedCommercialEmi } from "@/lib/commercial-financing";
import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import type { ProposalDeckSummary } from "@/lib/proposal-ppt";
import { cn } from "@/lib/utils";
import {
  Battery,
  Building2,
  Fuel,
  GitCompare,
  LayoutGrid,
  Scale,
  Sparkles,
} from "lucide-react";

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

type Props = {
  config: CommercialProposalConfig;
  summary: ProposalDeckSummary;
  onChange: (next: CommercialProposalConfig) => void;
  onOpenReview?: () => void;
};

export function CommercialControlCenter({ config, summary, onChange, onOpenReview }: Props) {
  const fin = config.financing ?? { enabled: true };
  const dg = config.dgAssumptions ?? { enabled: false };
  const dgAnalysis = computeDgHybridAnalysis(dg, config.solarPanels?.plantCapacityKw ?? summary.systemKw);
  const dcrCmp = config.solarPanels ? buildDcrCompareFromSolar(config.solarPanels) : null;
  const emiTable = buildCommercialEmiTable(summary.netCost, fin);
  const selectedEmi = selectedCommercialEmi(summary.netCost, fin);

  return (
    <section className="space-y-4 rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50/90 p-4 shadow-sm dark:border-indigo-500/20 dark:from-indigo-950/20 dark:via-[#0c1017] dark:to-[#0a0e14]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Proposal control center</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              EMI · DG · scenarios · comparisons · review before generate
            </p>
          </div>
        </div>
        {onOpenReview ? (
          <Button type="button" size="sm" className="gap-1.5 font-semibold" onClick={onOpenReview}>
            <LayoutGrid className="h-3.5 w-3.5" />
            Review proposal
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleCard
          icon={Scale}
          title="DCR vs Non-DCR compare"
          subtitle={dcrCmp ? `${inr(dcrCmp.deltaInr)} panel delta` : "Configure primary brands in solar section"}
          checked={config.dcrComparison?.enabled !== false}
          onChange={(on) => onChange({ ...config, dcrComparison: { ...config.dcrComparison, enabled: on } })}
        />
        <ToggleCard
          icon={GitCompare}
          title="Brand comparison"
          subtitle="Premium / budget panel brands in deck"
          checked={config.brandComparison?.enabled !== false}
          onChange={(on) => onChange({ ...config, brandComparison: { ...config.brandComparison, enabled: on } })}
        />
        <ToggleCard
          icon={Battery}
          title="EMI / financing"
          subtitle={selectedEmi ? `${inr(selectedEmi.monthlyEmi)}/mo · ${selectedEmi.tenureYears}y` : "Off"}
          checked={fin.enabled === true}
          onChange={(on) => onChange({ ...config, financing: { ...fin, enabled: on } })}
        />
        <ToggleCard
          icon={Fuel}
          title="Include DG Hybrid Analysis"
          subtitle={
            dg.enabled
              ? `Save ${inr(dgAnalysis.monthlyFuelSavingsInr)}/mo · −${dgAnalysis.runtimeReductionPct}% runtime`
              : "Solar + DG architecture, savings & scenarios"
          }
          checked={dg.enabled === true}
          onChange={(on) =>
            onChange({ ...config, dgAssumptions: { ...dg, enabled: on } })
          }
        />
      </div>

      {fin.enabled ? (
        <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3 dark:border-white/10 dark:bg-[#0f1419]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">EMI settings</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <FloatingLabelNumericInput
              label="Interest %"
              value={fin.interestRatePct ?? 9.5}
              fallback={9.5}
              onValueChange={(n) =>
                onChange({
                  ...config,
                  financing: { ...fin, interestRatePct: n ?? fin.interestRatePct ?? 9.5 },
                })
              }
              className="h-10 rounded-lg text-sm font-semibold"
            />
            <FloatingLabelNumericInput
              label="Down payment (₹)"
              value={fin.downPaymentInr ?? 0}
              onValueChange={(n) =>
                onChange({
                  ...config,
                  financing: { ...fin, downPaymentInr: n ?? fin.downPaymentInr ?? 0 },
                })
              }
              className="h-10 rounded-lg text-sm font-semibold"
            />
            <FloatingLabelNumericInput
              label="Tenure (years)"
              integer
              value={fin.selectedTenureYears ?? 7}
              fallback={7}
              onValueChange={(n) =>
                onChange({
                  ...config,
                  financing: {
                    ...fin,
                    selectedTenureYears: n ?? fin.selectedTenureYears ?? 7,
                    tenuresYears: fin.tenuresYears ?? [5, 7, 10],
                  },
                })
              }
              className="h-10 rounded-lg text-sm font-semibold"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {emiTable.map((row) => (
              <button
                key={row.tenureYears}
                type="button"
                onClick={() =>
                  onChange({
                    ...config,
                    financing: { ...fin, selectedTenureYears: row.tenureYears },
                  })
                }
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-[11px] font-bold tabular-nums",
                  fin.selectedTenureYears === row.tenureYears
                    ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                    : "border-slate-200 text-slate-600"
                )}
              >
                {row.tenureYears}y · {inr(row.monthlyEmi)}/mo
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {dg.enabled ? (
        <DgHybridConfigPanel
          config={config}
          systemKw={config.solarPanels?.plantCapacityKw ?? summary.systemKw}
          onChange={onChange}
        />
      ) : null}

      <CommercialExecutionTimeline
        timeline={config.executionTimeline ?? defaultExecutionTimeline()}
        onChange={(executionTimeline) => onChange({ ...config, executionTimeline })}
      />

      <div className="rounded-xl border border-sky-200/60 bg-sky-50/40 p-1 dark:border-sky-500/20 dark:bg-sky-950/10">
        <div className="mb-2 flex items-center gap-2 px-2 pt-2">
          <Building2 className="h-4 w-4 text-sky-600" />
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Plant capacity scenarios</p>
        </div>
        <WorkspaceCapacityScenariosModule
          systemKw={config.solarPanels?.plantCapacityKw ?? summary.systemKw}
          summary={summary}
          config={config}
          onChange={onChange}
        />
      </div>
    </section>
  );
}

function ToggleCard({
  icon: Icon,
  title,
  subtitle,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors",
        checked
          ? "border-indigo-200 bg-white shadow-sm dark:border-indigo-500/30 dark:bg-[#0f1419]"
          : "border-slate-200/80 bg-white/60 opacity-80 dark:border-white/10 dark:bg-white/[0.02]"
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 rounded border-slate-300"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-900 dark:text-slate-50">{title}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </label>
  );
}
