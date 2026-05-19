"use client";

import { Check, Layers } from "lucide-react";
import {
  PANEL_CATALOG,
  PANEL_TECHNOLOGY_OPTIONS,
  type PanelCatalogEntry,
  type PanelType,
} from "@/lib/commercial-panel-catalog";
import type { CommercialProposalConfig } from "@/lib/commercial-proposal-config";
import { NumericTextInput } from "@/components/ui/numeric-text-input";
import { WorkspaceDcrComparisonEngine } from "@/components/workspace/commercial/workspace-dcr-comparison-engine";
import type { ProposalDeckSummary } from "@/lib/proposal-ppt";
import { cn } from "@/lib/utils";

type Props = {
  systemKw: number;
  summary: ProposalDeckSummary;
  config: CommercialProposalConfig;
  onChange: (next: CommercialProposalConfig) => void;
};

function getOverride(
  config: CommercialProposalConfig,
  id: string
): { ratePerWpInr?: number; marginPct?: number; available?: boolean } {
  return config.panelRegistry?.overrides?.[id] ?? {};
}

function effectiveRate(entry: PanelCatalogEntry, config: CommercialProposalConfig): number {
  return getOverride(config, entry.id).ratePerWpInr ?? entry.ratePerWpInr;
}

export function WorkspacePanelPricingRegistry({ systemKw, summary, config, onChange }: Props) {
  const reg = config.panelRegistry ?? {};
  const dcrPanels = PANEL_CATALOG.filter((e) => e.panelType === "DCR");
  const nonDcrPanels = PANEL_CATALOG.filter((e) => e.panelType === "NON_DCR");

  function patchRegistry(partial: NonNullable<CommercialProposalConfig["panelRegistry"]>) {
    const nextReg = { ...reg, ...partial };
    onChange({ ...config, panelRegistry: nextReg });
  }

  function selectPanel(type: PanelType, catalogId: string) {
    const entry = PANEL_CATALOG.find((e) => e.id === catalogId);
    if (!entry) return;

    const nextReg = {
      ...reg,
      ...(type === "DCR"
        ? { selectedDcrCatalogId: catalogId }
        : { selectedNonDcrCatalogId: catalogId }),
    };

    const primaryId = nextReg.selectedNonDcrCatalogId ?? catalogId;
    const primary = PANEL_CATALOG.find((e) => e.id === primaryId) ?? entry;

    onChange({
      ...config,
      panelRegistry: nextReg,
      panel: {
        catalogId: primary.id,
        brandId: primary.brandId,
        watt: primary.watt,
        panelType: primary.panelType,
        ratePerWpInr: effectiveRate(primary, { ...config, panelRegistry: nextReg }),
        technology: primary.technology,
      },
      dcrComparison: {
        enabled: config.dcrComparison?.enabled !== false,
        brandId: entry.brandId,
        watt: entry.watt,
      },
      inverterPhase: config.inverterPhase ?? "three",
    });
  }

  function patchOverride(
    catalogId: string,
    field: "ratePerWpInr" | "marginPct" | "available",
    value: number | boolean | undefined
  ) {
    const overrides = { ...(reg.overrides ?? {}) };
    overrides[catalogId] = { ...overrides[catalogId], [field]: value };
    patchRegistry({ overrides });
  }

  return (
    <div className="space-y-8">
      <RegistrySection
        title="DCR panel registry"
        subtitle="ALMM-listed modules — subsidy-eligible path"
        accent="emerald"
        entries={dcrPanels}
        selectedId={reg.selectedDcrCatalogId}
        config={config}
        onSelect={(id) => selectPanel("DCR", id)}
        onPatchOverride={patchOverride}
      />
      <RegistrySection
        title="Non-DCR panel registry"
        subtitle="Import / non-ALMM modules — value path"
        accent="slate"
        entries={nonDcrPanels}
        selectedId={reg.selectedNonDcrCatalogId}
        config={config}
        onSelect={(id) => selectPanel("NON_DCR", id)}
        onPatchOverride={patchOverride}
      />

      <div className="border-t border-slate-200/80 pt-6">
        <WorkspaceDcrComparisonEngine systemKw={systemKw} summary={summary} config={config} />
      </div>

      <div className="rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-2.5">
        <p className="text-[11px] font-semibold text-sky-900">Inverter phase (BOM)</p>
        <div className="mt-2 flex gap-2">
          {(["single", "three"] as const).map((phase) => (
            <button
              key={phase}
              type="button"
              onClick={() => onChange({ ...config, inverterPhase: phase })}
              className={cn(
                "flex-1 rounded-lg border py-2 text-[11px] font-bold",
                (config.inverterPhase ?? "three") === phase
                  ? "border-sky-500 bg-sky-600 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              )}
            >
              {phase === "single" ? "Single phase" : "Three phase"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RegistrySection({
  title,
  subtitle,
  accent,
  entries,
  selectedId,
  config,
  onSelect,
  onPatchOverride,
}: {
  title: string;
  subtitle: string;
  accent: "emerald" | "slate";
  entries: PanelCatalogEntry[];
  selectedId?: string;
  config: CommercialProposalConfig;
  onSelect: (id: string) => void;
  onPatchOverride: (
    id: string,
    field: "ratePerWpInr" | "marginPct" | "available",
    value: number | boolean | undefined
  ) => void;
}) {
  const headerBg = accent === "emerald" ? "from-emerald-500/10 to-teal-500/5" : "from-slate-500/10 to-slate-500/5";

  return (
    <section>
      <div className={cn("mb-3 rounded-xl bg-gradient-to-r p-3", headerBg)}>
        <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Layers className="h-4 w-4" />
          {title}
        </p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <PanelPricingCard
            key={entry.id}
            entry={entry}
            selected={selectedId === entry.id}
            config={config}
            onSelect={() => onSelect(entry.id)}
            onPatchOverride={onPatchOverride}
          />
        ))}
      </div>
    </section>
  );
}

function PanelPricingCard({
  entry,
  selected,
  config,
  onSelect,
  onPatchOverride,
}: {
  entry: PanelCatalogEntry;
  selected: boolean;
  config: CommercialProposalConfig;
  onSelect: () => void;
  onPatchOverride: (
    id: string,
    field: "ratePerWpInr" | "marginPct" | "available",
    value: number | boolean | undefined
  ) => void;
}) {
  const ov = getOverride(config, entry.id);
  const available = ov.available !== false;
  const rate = effectiveRate(entry, config);

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 backdrop-blur-sm transition-all",
        selected
          ? "border-sky-400 bg-white shadow-md ring-1 ring-sky-200"
          : "border-white/60 bg-white/80 hover:border-sky-200",
        !available && "opacity-60"
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-slate-900">{entry.brandLabel}</p>
            <p className="text-xs text-slate-500">
              {entry.watt}W · {entry.technology}
            </p>
          </div>
          {selected && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        <p className="mt-2 text-lg font-extrabold tabular-nums text-slate-900">₹{rate}/Wp</p>
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
        <div>
          <label className="mb-1 block text-[9px] font-bold uppercase text-slate-400">Rate ₹/Wp</label>
          <NumericTextInput
            value={ov.ratePerWpInr ?? entry.ratePerWpInr}
            onValueChange={(v) => onPatchOverride(entry.id, "ratePerWpInr", v)}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
            aria-label={`Rate for ${entry.brandLabel}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-[9px] font-bold uppercase text-slate-400">Margin %</label>
          <NumericTextInput
            value={ov.marginPct}
            placeholder="—"
            onValueChange={(v) => onPatchOverride(entry.id, "marginPct", v)}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
            aria-label={`Margin for ${entry.brandLabel}`}
          />
        </div>
      </div>
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-600">
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => onPatchOverride(entry.id, "available", e.target.checked)}
          className="rounded border-slate-300"
        />
        Available for quotes
      </label>
    </div>
  );
}
