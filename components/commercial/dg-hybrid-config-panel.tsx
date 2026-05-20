"use client";

import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { NumericTextInput } from "@/components/ui/numeric-text-input";
import type { CommercialProposalConfig, DgAssumptions } from "@/lib/commercial-proposal-config";
import { computeDgHybridAnalysis, defaultDgForSystem } from "@/lib/dg-hybrid-engine";
import { cn } from "@/lib/utils";
import { Activity, Droplets, Fuel, Gauge, Zap } from "lucide-react";

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

type Props = {
  config: CommercialProposalConfig;
  systemKw: number;
  onChange: (next: CommercialProposalConfig) => void;
};

export function DgHybridConfigPanel({ config, systemKw, onChange }: Props) {
  const dg: DgAssumptions = {
    ...defaultDgForSystem(systemKw),
    ...config.dgAssumptions,
  };
  const analysis = computeDgHybridAnalysis(dg, systemKw);

  function patch(partial: Partial<DgAssumptions>) {
    const next = { ...dg, ...partial, enabled: dg.enabled };
    if (partial.runtimeHoursPerDay != null) next.hoursPerDay = partial.runtimeHoursPerDay;
    onChange({ ...config, dgAssumptions: next });
  }

  if (!dg.enabled) return null;

  return (
    <div className="rounded-xl border border-rose-200/70 bg-gradient-to-br from-rose-50/50 via-white to-slate-50/80 p-3 dark:border-rose-900/40 dark:from-rose-950/20 dark:via-[#0f1419] dark:to-[#0a0e14]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
          DG Hybrid configuration
        </p>
        <div className="flex flex-wrap gap-2 text-[10px] font-semibold tabular-nums text-slate-600 dark:text-slate-400">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            Save {inr(analysis.monthlyFuelSavingsInr)}/mo
          </span>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
            −{analysis.runtimeReductionPct}% runtime
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Field icon={Gauge} label="DG capacity (kVA)">
          <NumericTextInput
            value={dg.capacityKva}
            onValueChange={(n) => patch({ capacityKva: n ?? 0 })}
            className="h-10 w-full rounded-lg border border-slate-200 px-2 text-sm font-semibold dark:border-white/10"
          />
        </Field>
        <Field icon={Fuel} label="Fuel type">
          <select
            value={dg.fuelType ?? "diesel"}
            onChange={(e) =>
              patch({ fuelType: e.target.value as DgAssumptions["fuelType"] })
            }
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold dark:border-white/10 dark:bg-[#0f1419]"
          >
            <option value="diesel">Diesel</option>
            <option value="natural_gas">Natural gas</option>
            <option value="dual_fuel">Dual fuel</option>
          </select>
        </Field>
        <Field icon={Activity} label="Runtime (hrs / day)">
          <NumericTextInput
            value={dg.runtimeHoursPerDay ?? dg.hoursPerDay}
            onValueChange={(n) => patch({ runtimeHoursPerDay: n ?? 0 })}
            className="h-10 w-full rounded-lg border border-slate-200 px-2 text-sm font-semibold dark:border-white/10"
          />
        </Field>
        <Field icon={Droplets} label="Fuel consumption (L/h)">
          <NumericTextInput
            value={dg.fuelConsumptionLph}
            onValueChange={(n) => patch({ fuelConsumptionLph: n ?? 0 })}
            className="h-10 w-full rounded-lg border border-slate-200 px-2 text-sm font-semibold dark:border-white/10"
          />
        </Field>
        <Field icon={Zap} label="Peak load (kW)">
          <NumericTextInput
            value={dg.peakLoadKw}
            onValueChange={(n) => patch({ peakLoadKw: n ?? 0 })}
            className="h-10 w-full rounded-lg border border-slate-200 px-2 text-sm font-semibold dark:border-white/10"
          />
        </Field>
        <Field icon={Zap} label="Critical load (kW)">
          <NumericTextInput
            value={dg.criticalLoadKw}
            onValueChange={(n) => patch({ criticalLoadKw: n ?? 0 })}
            className="h-10 w-full rounded-lg border border-slate-200 px-2 text-sm font-semibold dark:border-white/10"
          />
        </Field>
        <FloatingLabelInput
          label="Monthly fuel cost (₹)"
          inputMode="decimal"
          value={String(dg.monthlyFuelCostInr ?? "")}
          onChange={(e) =>
            patch({ monthlyFuelCostInr: parseFloat(e.target.value.replace(/,/g, "")) || 0 })
          }
          className="h-10 rounded-lg text-sm font-semibold sm:col-span-2"
        />
        <FloatingLabelInput
          label="Diesel ₹ / litre"
          inputMode="decimal"
          value={String(dg.dieselPricePerLitre ?? 95)}
          onChange={(e) =>
            patch({ dieselPricePerLitre: parseFloat(e.target.value) || 95 })
          }
          className="h-10 rounded-lg text-sm font-semibold"
        />
        <FloatingLabelInput
          label="Operating cost (₹ / hr)"
          inputMode="decimal"
          value={String(dg.operatingCostPerHourInr ?? "")}
          onChange={(e) =>
            patch({ operatingCostPerHourInr: parseFloat(e.target.value.replace(/,/g, "")) || 0 })
          }
          className="h-10 rounded-lg text-sm font-semibold"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={dg.showArchitectureDiagram !== false}
            onChange={(e) => patch({ showArchitectureDiagram: e.target.checked })}
            className="rounded"
          />
          Architecture diagram in proposal
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={dg.showOperationScenarios !== false}
            onChange={(e) => patch({ showOperationScenarios: e.target.checked })}
            className="rounded"
          />
          Operation scenarios (day / peak / outage)
        </label>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        <Icon className="h-3 w-3" />
        {label}
      </label>
      {children}
    </div>
  );
}
