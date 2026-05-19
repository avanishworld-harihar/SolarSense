"use client";

/**
 * Proposal builder — executive narrative & presentation orchestration only.
 * Pricing, scenarios, and financing live in Open Workspace tabs.
 */

import {
  BookOpen,
  Building2,
  Eye,
  Fuel,
  LayoutGrid,
  Scale,
  Sparkles,
  TrendingUp,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import { getOrgType } from "@/lib/org-type-defaults";
import type { StoryMode } from "@/lib/proposal-story-copy";
import { NumericTextInput } from "@/components/ui/numeric-text-input";
import { cn } from "@/lib/utils";

const STORY_MODES: { id: StoryMode; label: string; hint: string }[] = [
  { id: "executive_pitch", label: "Executive Pitch", hint: "Board / owner — ROI-led" },
  { id: "cfo_brief", label: "CFO Brief", hint: "Finance — IRR & cashflow" },
  { id: "operations_brief", label: "Operations", hint: "Facility — reliability" },
  { id: "sustainability_story", label: "ESG Story", hint: "Carbon & reputation" },
];

type Props = {
  config: CommercialProposalConfig;
  onChange: (next: CommercialProposalConfig) => void;
  onOpenReview?: () => void;
  workspaceHref?: string;
  className?: string;
};

function Toggle({ checked }: { checked: boolean }) {
  return (
    <div className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-sky-500" : "bg-slate-300")}>
      <div
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </div>
  );
}

export function CommercialNarrativePanel({
  config,
  onChange,
  onOpenReview,
  workspaceHref,
  className,
}: Props) {
  const orgSpec = config.orgType ? getOrgType(config.orgType) : null;
  const storyMode = config.storyMode ?? "executive_pitch";
  const dg = config.dgAssumptions;
  const dcrOn = config.dcrComparison?.enabled !== false;
  const scenariosOn = config.capacityScenarios?.enabled !== false;
  const financingOn = config.financing?.enabled === true;

  function update(partial: Partial<CommercialProposalConfig>) {
    onChange({ ...config, ...partial });
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-sky-200/80 bg-white/90 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center gap-3 border-b border-sky-100 px-4 py-3.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Commercial Configuration</p>
          <p className="text-[11px] text-slate-500">Story, assumptions and presentation</p>
        </div>
        {orgSpec ? (
          <div className="hidden items-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50 px-2.5 py-1.5 sm:flex">
            <Building2 className="h-3 w-3 text-sky-600" />
            <span className="text-[11px] font-bold text-sky-700">{orgSpec.labelEn}</span>
          </div>
        ) : null}
      </div>

      <div className="px-4">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <BookOpen className="h-3 w-3" />
          Proposal tone
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STORY_MODES.map((m) => {
            const active = storyMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => update({ storyMode: m.id })}
                className={cn(
                  "rounded-xl border px-2.5 py-2 text-left transition-all",
                  active
                    ? "border-indigo-400 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50"
                )}
              >
                <p className="text-[11px] font-bold leading-tight">{m.label}</p>
                <p className={cn("mt-0.5 text-[9px]", active ? "text-indigo-100" : "text-slate-500")}>{m.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-4 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-xs font-bold text-slate-900">DG / diesel backup context</p>
              <p className="text-[10px] text-slate-500">Hotel, factory and critical-load profiles</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={dg?.enabled === true}
            onClick={() =>
              update({
                dgAssumptions: {
                  ...dg,
                  enabled: !dg?.enabled,
                  hoursPerDay: dg?.hoursPerDay ?? 4,
                },
              })
            }
            className="focus:outline-none"
          >
            <Toggle checked={dg?.enabled === true} />
          </button>
        </div>
        {dg?.enabled ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">DG hours / day</label>
              <NumericTextInput
                value={dg.hoursPerDay}
                fallback={4}
                onValueChange={(v) => update({ dgAssumptions: { ...dg, enabled: true, hoursPerDay: v } })}
                className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm"
                aria-label="DG hours per day"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Monthly fuel (INR)</label>
              <NumericTextInput
                integer
                value={dg.monthlyFuelCostInr}
                onValueChange={(v) =>
                  update({ dgAssumptions: { ...dg, enabled: true, monthlyFuelCostInr: v } })
                }
                className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm"
                aria-label="Monthly diesel fuel cost"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="px-4">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <LayoutGrid className="h-3 w-3" />
          Comparison sections in deck
        </p>
        <p className="mb-2 text-[10px] text-slate-400">
          Configure rates and scenarios in Open Workspace. Toggle visibility here.
        </p>
        <div className="space-y-2">
          {[
            {
              key: "dcr",
              on: dcrOn,
              icon: Scale,
              title: "DCR vs Non-DCR",
              desc: "Subsidy-aware cost comparison card",
              patch: (v: boolean) => update({ dcrComparison: { ...config.dcrComparison, enabled: v } }),
            },
            {
              key: "scenarios",
              on: scenariosOn,
              icon: TrendingUp,
              title: "Capacity scenarios",
              desc: "Multi-kW executive comparison",
              patch: (v: boolean) =>
                update({
                  capacityScenarios: {
                    ...config.capacityScenarios,
                    enabled: v,
                    scenarios: config.capacityScenarios?.scenarios ?? [],
                    recommendedId: config.capacityScenarios?.recommendedId,
                  },
                }),
            },
            {
              key: "financing",
              on: financingOn,
              icon: CreditCard,
              title: "Financing / EMI",
              desc: "Banking-grade EMI table",
              patch: (v: boolean) => update({ financing: { ...config.financing, enabled: v } }),
            },
          ].map((row) => (
            <button
              key={row.key}
              type="button"
              onClick={() => row.patch(!row.on)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                row.on ? "border-sky-200 bg-sky-50/80" : "border-slate-200 bg-slate-50/40 opacity-80"
              )}
            >
              <row.icon className={cn("h-4 w-4", row.on ? "text-sky-600" : "text-slate-400")} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-slate-900">{row.title}</p>
                <p className="text-[10px] text-slate-500">{row.desc}</p>
              </div>
              <Toggle checked={row.on} />
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Executive notes (optional)
        </label>
        <textarea
          rows={2}
          placeholder="Key talking points for this client meeting"
          value={config.presentationNotes ?? ""}
          onChange={(e) => update({ presentationNotes: e.target.value })}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-sky-50 px-4 py-3">
        {onOpenReview ? (
          <button
            type="button"
            onClick={onOpenReview}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
          >
            <Eye className="h-3.5 w-3.5" />
            Review sections
          </button>
        ) : null}
        {workspaceHref ? (
          <a
            href={workspaceHref}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Workspace
          </a>
        ) : null}
      </div>

      <p className="px-4 pb-3 text-[10px] text-slate-400">
        Panel registry, capacity scenarios and financing are configured in Open Workspace after save.
      </p>
    </div>
  );
}
