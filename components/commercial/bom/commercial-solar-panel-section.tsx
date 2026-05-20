"use client";

import { Button } from "@/components/ui/button";
import {
  FloatingLabelInput,
  FloatingLabelNumericInput,
  FloatingLabelSelect,
} from "@/components/ui/floating-label-input";
import { NumericTextInput } from "@/components/ui/numeric-text-input";
import { PANEL_TECHNOLOGY_OPTIONS } from "@/lib/commercial-panel-catalog";
import { COMMERCIAL_PANEL_WATT_PRESETS } from "@/lib/commercial-bom-panels";
import {
  moduleCountForRow,
  quotePanelRow,
  type PanelRowQuote,
} from "@/lib/commercial-solar-engine";
import {
  newPanelBrandRowId,
  type CommercialSolarPanels,
  type PanelBrandRow,
  type PanelTrackGroup,
} from "@/lib/commercial-solar-schema";
import { cn } from "@/lib/utils";
import { ChevronDown, Leaf, Plus, Star, Sun, Trash2 } from "lucide-react";
import { useMemo } from "react";

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

type Props = {
  solar: CommercialSolarPanels;
  onChange: (next: CommercialSolarPanels) => void;
};

export function CommercialSolarPanelSection({ solar, onChange }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm dark:border-white/10 dark:from-[#0c1017] dark:to-[#0a0e14] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Solar panel configuration
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Plant capacity drives module count · edit brands, watt, rate per track
          </p>
        </div>
        <div className="w-full max-w-[9rem] sm:shrink-0">
          <FloatingLabelNumericInput
            label="Plant capacity (kW)"
            value={solar.plantCapacityKw}
            onValueChange={(n) => {
              if (n != null && n > 0) {
                onChange({ ...solar, plantCapacityKw: Math.round(n * 100) / 100 });
              }
            }}
            className="h-11 rounded-xl font-semibold tabular-nums"
          />
        </div>
      </div>

      <TrackGroup
        title="DCR panels"
        subtitle="ALMM / subsidy-eligible modules"
        icon={Leaf}
        tone="emerald"
        group={solar.dcr}
        track="dcr"
        plantKw={solar.plantCapacityKw}
        onChange={(dcr) => onChange({ ...solar, dcr })}
      />
      <TrackGroup
        title="Non-DCR panels"
        subtitle="Import / lower module rate options"
        icon={Sun}
        tone="slate"
        group={solar.nonDcr}
        track="non_dcr"
        plantKw={solar.plantCapacityKw}
        onChange={(nonDcr) => onChange({ ...solar, nonDcr })}
      />
    </section>
  );
}

function TrackGroup({
  title,
  subtitle,
  icon: Icon,
  tone,
  group,
  track,
  plantKw,
  onChange,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  tone: "emerald" | "slate";
  group: PanelTrackGroup;
  track: "dcr" | "non_dcr";
  plantKw: number;
  onChange: (g: PanelTrackGroup) => void;
}) {
  const collapsed = group.collapsed === true;
  const quotes = useMemo(
    () => group.rows.map((row) => quotePanelRow(plantKw, row, track)),
    [group.rows, plantKw, track]
  );
  const trackTotal = quotes.reduce((s, q) => s + q.hardwareInr, 0);

  const shell =
    tone === "emerald"
      ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30 dark:border-emerald-500/25 dark:from-emerald-950/25 dark:via-[#0c1017] dark:to-emerald-950/10"
      : "border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white to-slate-100/40 dark:border-white/10 dark:from-slate-900/40 dark:via-[#0c1017] dark:to-slate-900/20";

  return (
    <div className={cn("overflow-hidden rounded-2xl border shadow-sm", shell)}>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => onChange({ ...group, collapsed: !collapsed })}
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            tone === "emerald"
              ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300"
              : "bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-slate-300"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{title}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-50">{inr(trackTotal)}</p>
          <p className="text-[10px] font-medium text-slate-500">{group.rows.length} brand(s)</p>
        </div>
        <label
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={group.enabled}
            onChange={(e) => onChange({ ...group, enabled: e.target.checked })}
            className="rounded border-slate-300"
          />
          On
        </label>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", !collapsed && "rotate-180")} />
      </button>

      {!collapsed && group.enabled ? (
        <div className="space-y-2 border-t border-black/5 px-3 pb-3 pt-2 dark:border-white/10">
          {group.rows.map((row, idx) => (
            <BrandRowCard
              key={row.id}
              row={row}
              quote={quotes[idx]!}
              track={track}
              onPatch={(patch) => {
                const rows = group.rows.map((r) => (r.id === row.id ? { ...r, ...patch } : r));
                onChange({ ...group, rows });
              }}
              onSetPrimary={() => {
                onChange({
                  ...group,
                  rows: group.rows.map((r) => ({ ...r, isPrimary: r.id === row.id })),
                });
              }}
              onRemove={() => onChange({ ...group, rows: group.rows.filter((r) => r.id !== row.id) })}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full gap-1.5 border-dashed text-xs font-semibold"
            onClick={() =>
              onChange({
                ...group,
                rows: [
                  ...group.rows,
                  {
                    id: newPanelBrandRowId(),
                    brand: "",
                    watt: 540,
                    technology: "Mono PERC",
                    ratePerWpInr: track === "dcr" ? 42 : 38,
                  },
                ],
              })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add brand
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function BrandRowCard({
  row,
  quote,
  track,
  onPatch,
  onSetPrimary,
  onRemove,
}: {
  row: PanelBrandRow;
  quote: PanelRowQuote;
  track: "dcr" | "non_dcr";
  onPatch: (p: Partial<PanelBrandRow>) => void;
  onSetPrimary: () => void;
  onRemove: () => void;
}) {
  const autoQty = moduleCountForRow(quote.plantKw, row);

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-white/95 p-3 pr-12 shadow-sm dark:bg-[#0f1419]/95",
        row.isPrimary
          ? "border-sky-300 ring-1 ring-sky-200/80 dark:border-sky-500/40"
          : "border-slate-200/80 dark:border-white/10"
      )}
    >
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <button
          type="button"
          title="Set as primary for comparison"
          onClick={onSetPrimary}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
            row.isPrimary
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-white/10"
          )}
        >
          <Star className={cn("h-3.5 w-3.5", row.isPrimary && "fill-current")} />
        </button>
        <button
          type="button"
          title="Remove brand"
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <FloatingLabelInput
          label="Brand"
          value={row.brand}
          onChange={(e) => onPatch({ brand: e.target.value })}
          className="h-10 rounded-lg text-sm font-semibold"
        />
        <FloatingLabelNumericInput
          label="Watt (Wp)"
          integer
          list={`w-${row.id}`}
          value={row.watt}
          onValueChange={(n) => onPatch({ watt: n != null && n > 0 ? n : row.watt })}
          className="h-10 rounded-lg text-sm font-semibold tabular-nums"
        />
        <datalist id={`w-${row.id}`}>
          {COMMERCIAL_PANEL_WATT_PRESETS.map((w) => (
            <option key={w} value={String(w)} />
          ))}
        </datalist>
        <FloatingLabelSelect
          label="Technology"
          value={row.technology ?? ""}
          onChange={(e) => onPatch({ technology: e.target.value })}
          className="h-10 rounded-lg text-sm font-bold"
        >
          <option value="">—</option>
          {PANEL_TECHNOLOGY_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </FloatingLabelSelect>
        <FloatingLabelNumericInput
          label="Rate (₹/Wp)"
          value={row.ratePerWpInr}
          onValueChange={(n) =>
            onPatch({ ratePerWpInr: n != null && n >= 0 ? n : row.ratePerWpInr })
          }
          className="h-10 rounded-lg text-sm font-semibold tabular-nums"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-400">
        <span>
          Auto qty: <strong className="tabular-nums text-slate-900 dark:text-slate-100">{autoQty}</strong> modules
        </span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span>
          Hardware: <strong className="tabular-nums text-slate-900 dark:text-slate-100">{inr(quote.hardwareInr)}</strong>
        </span>
        <NumericTextInput
          value={row.quantityOverride ?? undefined}
          onValueChange={(n) => onPatch({ quantityOverride: n ?? undefined })}
          placeholder="Qty override"
          className="ml-auto h-8 w-24 rounded-lg border border-slate-200 px-2 text-center text-xs font-bold dark:border-white/10"
          aria-label="Quantity override"
        />
      </div>
    </div>
  );
}
