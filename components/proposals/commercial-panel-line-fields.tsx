"use client";

import { FloatingLabelNumericInput, FloatingLabelSelect } from "@/components/ui/floating-label-input";
import { PANEL_TECHNOLOGY_OPTIONS } from "@/lib/commercial-panel-catalog";
import { COMMERCIAL_PANEL_WATT_PRESETS, isTrackedCommercialPanelLine } from "@/lib/commercial-bom-panels";
import type { PricingLineItem } from "@/lib/proposal-pricing-lines";
import { cn } from "@/lib/utils";

export type CommercialPanelFieldLabels = {
  wattLabel: string;
  technologyLabel: string;
  trackLabel: string;
  rateHint?: string;
};

type PatchFn = (patch: Partial<PricingLineItem>) => void;

export function PanelTrackBadge({ line }: { line: PricingLineItem }) {
  if (!isTrackedCommercialPanelLine(line)) return <span className="text-slate-400">—</span>;
  const isDcr = line.panel_track === "dcr";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        isDcr
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
      )}
    >
      {isDcr ? "DCR" : "Non-DCR"}
    </span>
  );
}

function WattField({
  line,
  onPatch,
  label,
  className,
}: {
  line: PricingLineItem;
  onPatch: PatchFn;
  label: string;
  className?: string;
}) {
  return (
    <>
      <FloatingLabelNumericInput
        label={label}
        integer
        list={`watt-presets-${line.id}`}
        value={line.watt}
        onValueChange={(n) => onPatch({ watt: n != null && n > 0 ? n : undefined })}
        className={className}
      />
      <datalist id={`watt-presets-${line.id}`}>
        {COMMERCIAL_PANEL_WATT_PRESETS.map((w) => (
          <option key={w} value={String(w)} />
        ))}
      </datalist>
    </>
  );
}

function TechnologyField({
  line,
  onPatch,
  label,
  className,
}: {
  line: PricingLineItem;
  onPatch: PatchFn;
  label: string;
  className?: string;
}) {
  return (
    <FloatingLabelSelect
      label={label}
      value={line.technology ?? ""}
      onChange={(e) => onPatch({ technology: e.target.value })}
      className={className}
    >
      <option value="">—</option>
      {PANEL_TECHNOLOGY_OPTIONS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </FloatingLabelSelect>
  );
}

/** Extra BOM table cells (track, watt, technology) for commercial panel rows. */
export function CommercialPanelTableCells({
  line,
  onPatch,
  labels,
}: {
  line: PricingLineItem;
  onPatch: PatchFn;
  labels: CommercialPanelFieldLabels;
}) {
  if (!isTrackedCommercialPanelLine(line)) {
    return (
      <>
        <td className="px-2 py-1.5" />
        <td className="px-2 py-1.5" />
        <td className="px-2 py-1.5" />
      </>
    );
  }

  const inputCls =
    "h-9 w-full min-w-[4rem] rounded-md border border-slate-200 bg-white text-[11px] font-semibold dark:border-white/10 dark:bg-white/5";

  return (
    <>
      <td className="px-2 py-1.5 align-top">
        <PanelTrackBadge line={line} />
      </td>
      <td className="px-2 py-1.5 align-top">
        <WattField line={line} onPatch={onPatch} label={labels.wattLabel} className={inputCls} />
      </td>
      <td className="px-2 py-1.5 align-top">
        <TechnologyField line={line} onPatch={onPatch} label={labels.technologyLabel} className={inputCls} />
      </td>
    </>
  );
}

/** Stacked fields for mobile BOM cards. */
export function CommercialPanelMobileFields({
  line,
  onPatch,
  labels,
}: {
  line: PricingLineItem;
  onPatch: PatchFn;
  labels: CommercialPanelFieldLabels;
}) {
  if (!isTrackedCommercialPanelLine(line)) return null;
  const inputCls = "h-11 rounded-xl text-sm";
  return (
    <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{labels.trackLabel}</span>
        <PanelTrackBadge line={line} />
      </div>
      <WattField line={line} onPatch={onPatch} label={labels.wattLabel} className={inputCls} />
      <TechnologyField line={line} onPatch={onPatch} label={labels.technologyLabel} className={inputCls} />
      {labels.rateHint ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{labels.rateHint}</p>
      ) : null}
    </div>
  );
}
