"use client";

import { Button } from "@/components/ui/button";
import {
  FloatingLabelInput,
  FloatingLabelNumericInput,
  FloatingLabelSelect,
} from "@/components/ui/floating-label-input";
import { isTrackedCommercialPanelLine } from "@/lib/commercial-bom-panels";
import { PRICING_LINE_KINDS, type PricingLineKind } from "@/lib/pricing-line-kinds";
import { defaultCatalogCategoryForLineKind } from "@/lib/epc-component-catalog";
import {
  defaultLabelForKind,
  defaultUnitForKind,
  lineItemTotalInr,
  newPricingLineId,
  type PricingLineItem,
} from "@/lib/proposal-pricing-lines";
import { cn } from "@/lib/utils";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

type Props = {
  lines: PricingLineItem[];
  onChange: (lines: PricingLineItem[]) => void;
  labels: {
    title: string;
    subtitle: string;
    addLine: string;
    removeLine: string;
  };
};

export function CommercialHardwareBom({ lines, onChange, labels }: Props) {
  const hardwareLines = lines.filter((l) => !isTrackedCommercialPanelLine(l));
  const [dragId, setDragId] = useState<string | null>(null);

  const reorder = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const panelLines = lines.filter(isTrackedCommercialPanelLine);
      const hw = lines.filter((l) => !isTrackedCommercialPanelLine(l));
      const fromIdx = hw.findIndex((l) => l.id === fromId);
      const toIdx = hw.findIndex((l) => l.id === toId);
      if (fromIdx < 0 || toIdx < 0) return;
      const next = [...hw];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved!);
      onChange([...panelLines, ...next]);
    },
    [lines, onChange]
  );

  function updateLine(id: string, patch: Partial<PricingLineItem>) {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    if (hardwareLines.length <= 1) return;
    onChange(lines.filter((l) => l.id !== id));
  }

  function addLine() {
    onChange([
      ...lines,
      {
        id: newPricingLineId(),
        kind: "custom",
        label: defaultLabelForKind("custom"),
        brand: "",
        quantity: 1,
        unit_rate_inr: 0,
        unit: defaultUnitForKind("custom"),
        catalog_category: defaultCatalogCategoryForLineKind("custom"),
      },
    ]);
  }

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-white/10 dark:bg-[#0c1017]/90">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">{labels.title}</h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{labels.subtitle}</p>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
        {hardwareLines.map((L) => {
          const total = lineItemTotalInr(L);
          return (
            <li
              key={L.id}
              draggable
              onDragStart={() => setDragId(L.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) reorder(dragId, L.id);
                setDragId(null);
              }}
              className={cn(
                "group flex gap-2 px-2 py-2 transition-colors hover:bg-slate-50/90 dark:hover:bg-white/[0.03]",
                dragId === L.id && "opacity-60"
              )}
            >
              <div className="flex w-8 shrink-0 flex-col items-center justify-center gap-1 pt-2 opacity-40 group-hover:opacity-100">
                <GripVertical className="h-4 w-4 cursor-grab text-slate-400 active:cursor-grabbing" aria-hidden />
                <button
                  type="button"
                  title={labels.removeLine}
                  onClick={() => removeLine(L.id)}
                  disabled={hardwareLines.length <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid min-w-0 flex-1 gap-2 py-1 sm:grid-cols-2 lg:grid-cols-6">
                <FloatingLabelSelect
                  label="Category"
                  value={L.kind}
                  onChange={(e) => {
                    const k = e.target.value as PricingLineKind;
                    updateLine(L.id, {
                      kind: k,
                      label: defaultLabelForKind(k),
                      catalog_category: defaultCatalogCategoryForLineKind(k),
                      unit: defaultUnitForKind(k),
                    });
                  }}
                  className="h-9 text-[11px] font-bold"
                >
                  {PRICING_LINE_KINDS.filter((k) => k !== "panels").map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </FloatingLabelSelect>
                <FloatingLabelInput
                  label="Item"
                  value={L.label}
                  onChange={(e) => updateLine(L.id, { label: e.target.value })}
                  className="h-9 text-[11px] font-semibold"
                />
                <FloatingLabelInput
                  label="Brand"
                  value={L.brand}
                  onChange={(e) => updateLine(L.id, { brand: e.target.value })}
                  className="h-9 text-[11px]"
                />
                <FloatingLabelNumericInput
                  label="Qty"
                  value={L.quantity}
                  onValueChange={(n) =>
                    updateLine(L.id, { quantity: n != null && n >= 0 ? n : L.quantity })
                  }
                  className="h-9 text-[11px] font-bold tabular-nums"
                />
                <FloatingLabelNumericInput
                  label="Rate ₹"
                  value={L.unit_rate_inr}
                  onValueChange={(n) =>
                    updateLine(L.id, { unit_rate_inr: n != null && n >= 0 ? n : L.unit_rate_inr })
                  }
                  className="h-9 text-[11px] font-bold tabular-nums"
                />
                <div className="flex h-9 items-center justify-end sm:col-span-2 lg:col-span-1">
                  <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-slate-100 px-3 py-2 dark:border-white/10">
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1 text-xs font-semibold" onClick={addLine}>
          <Plus className="h-3.5 w-3.5" />
          {labels.addLine}
        </Button>
      </div>
    </section>
  );
}
