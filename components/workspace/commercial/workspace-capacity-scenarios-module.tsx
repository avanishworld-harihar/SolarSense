"use client";

import { ChevronDown, ChevronUp, Star, TrendingUp } from "lucide-react";
import {
  buildDefaultScenarios,
  computeCapacityScenarioMetrics,
  type CapacityScenarioInput,
} from "@/lib/commercial-capacity-scenarios";
import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import { NumericTextInput } from "@/components/ui/numeric-text-input";
import type { ProposalDeckSummary } from "@/lib/proposal-ppt";
import { cn } from "@/lib/utils";

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

type Props = {
  systemKw: number;
  summary: ProposalDeckSummary;
  config: CommercialProposalConfig;
  onChange: (next: CommercialProposalConfig) => void;
};

export function WorkspaceCapacityScenariosModule({ systemKw, summary, config, onChange }: Props) {
  const scenarios =
    config.capacityScenarios?.scenarios ?? buildDefaultScenarios(systemKw);
  const recommendedId = config.capacityScenarios?.recommendedId ?? "primary";
  const enabled = config.capacityScenarios?.enabled !== false;
  const moduleWatt = config.panel?.watt ?? 540;

  const metrics = scenarios.map((s) => computeCapacityScenarioMetrics(summary, s, moduleWatt));

  function updateScenarios(next: CapacityScenarioInput[], recId?: string) {
    onChange({
      ...config,
      capacityScenarios: {
        enabled,
        scenarios: next,
        recommendedId: recId ?? recommendedId,
      },
    });
  }

  function moveScenario(id: string, dir: -1 | 1) {
    const idx = scenarios.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= scenarios.length) return;
    const next = [...scenarios];
    [next[idx], next[j]] = [next[j], next[idx]];
    updateScenarios(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
        <div>
          <p className="text-sm font-bold text-slate-900">Multi-kW executive comparison</p>
          <p className="text-xs text-slate-500">Shown in proposal when enabled from Commercial Config</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) =>
              onChange({
                ...config,
                capacityScenarios: { ...config.capacityScenarios, enabled: e.target.checked, scenarios, recommendedId },
              })
            }
            className="rounded border-slate-300"
          />
          Enabled
        </label>
      </div>

      <div className="space-y-3">
        {metrics.map((m, idx) => {
          const isRec = m.id === recommendedId;
          return (
            <div
              key={m.id}
              className={cn(
                "rounded-2xl border p-4 backdrop-blur-sm transition-all",
                isRec
                  ? "border-sky-400 bg-gradient-to-br from-sky-50/90 to-white shadow-md ring-1 ring-sky-200"
                  : "border-white/70 bg-white/90"
              )}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className={cn("h-4 w-4", isRec ? "text-sky-600" : "text-slate-400")} />
                  <NumericTextInput
                    value={m.systemKw}
                    onValueChange={(kw) => {
                      const next = scenarios.map((s) =>
                        s.id === m.id ? { ...s, systemKw: kw ?? s.systemKw } : s
                      );
                      updateScenarios(next);
                    }}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-center text-lg font-bold"
                    aria-label="Scenario kW"
                  />
                  <span className="text-sm font-bold text-slate-600">kW</span>
                  <input
                    type="text"
                    value={m.label}
                    onChange={(e) => {
                      const next = scenarios.map((s) =>
                        s.id === m.id ? { ...s, label: e.target.value } : s
                      );
                      updateScenarios(next);
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveScenario(m.id, -1)}
                    className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === scenarios.length - 1}
                    onClick={() => moveScenario(m.id, 1)}
                    className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateScenarios(scenarios, m.id)}
                    className={cn(
                      "ml-1 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold",
                      isRec ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-sky-50"
                    )}
                  >
                    {isRec && <Star className="h-3 w-3 fill-current" />}
                    {isRec ? "Recommended" : "Set recommended"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MetricPill label="Net cost" value={inr(m.netCostInr)} />
                <MetricPill label="Annual gen" value={`${m.annualGenKwh.toLocaleString("en-IN")} kWh`} />
                <MetricPill label="Roof ~" value={`${m.roofAreaSqmApprox} m²`} />
                <MetricPill label="Payback" value={`${m.paybackYears} yrs`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
      <p className="text-[9px] font-bold uppercase text-slate-400">{label}</p>
      <p className="text-xs font-bold text-slate-800">{value}</p>
    </div>
  );
}
