"use client";

import { Button } from "@/components/ui/button";
import { FloatingLabelInput, FloatingLabelSelect } from "@/components/ui/floating-label-input";
import { useToast } from "@/components/ui/toast-center";
import type { PricingLineKind } from "@/lib/pricing-line-kinds";
import { PRICING_LINE_KINDS } from "@/lib/pricing-line-kinds";
import { defaultCatalogCategoryForLineKind } from "@/lib/epc-component-catalog";
import {
  defaultLabelForKind,
  effectiveNetPricePerWattInr,
  hydrateLineItems,
  INVERTER_BRAND_PRESETS,
  lineItemTotalInr,
  newPricingLineId,
  PANEL_BRAND_PRESETS,
  type PricingLineItem,
  proposalPricingRowFromLineItems
} from "@/lib/proposal-pricing-lines";
import { grossSubtotalInr } from "@/lib/proposal-pricing-merge";
import type { ProposalPricingRow } from "@/lib/proposal-pricing-schema";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type ProposalPricingConfiguratorLabels = {
  title: string;
  subtitle: string;
  systemSize: string;
  lineCategory: string;
  lineDesc: string;
  componentCol: string;
  brandCol: string;
  qtyCol: string;
  rateCol: string;
  totalCol: string;
  addLine: string;
  grossTotal: string;
  subsidyLabel: string;
  discountLabel: string;
  netPayable: string;
  ppwGross: string;
  ppwNet: string;
  manualFinal: string;
  save: string;
  saving: string;
  saved: string;
  saveFailed: string;
};

export type ProposalPricingConfiguratorProps = {
  proposalId: string;
  initial: ProposalPricingRow;
  labels: ProposalPricingConfiguratorLabels;
  className?: string;
  onSaved?: (row: ProposalPricingRow) => void;
};

function num(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function ProposalPricingConfigurator({
  proposalId,
  initial,
  labels,
  className,
  onSaved
}: ProposalPricingConfiguratorProps) {
  const { t } = useLanguage();
  const toast = useToast();
  const [lines, setLines] = useState<PricingLineItem[]>(() => hydrateLineItems(initial));
  const [systemKw, setSystemKw] = useState(initial.system_kw);
  const [manualFinal, setManualFinal] = useState(initial.manual_final_override);
  const [manualFinalAmt, setManualFinalAmt] = useState(initial.final_amount_inr);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLines(hydrateLineItems(initial));
    setSystemKw(initial.system_kw);
    setManualFinal(initial.manual_final_override);
    setManualFinalAmt(initial.final_amount_inr);
  }, [initial]);

  const preview = useMemo(() => {
    return proposalPricingRowFromLineItems(
      { ...initial, system_kw: systemKw, manual_final_override: manualFinal, final_amount_inr: manualFinalAmt },
      lines,
      {
        system_kw: systemKw,
        manual_final_override: manualFinal,
        final_amount_inr: manualFinal ? manualFinalAmt : undefined
      }
    );
  }, [initial, lines, systemKw, manualFinal, manualFinalAmt]);

  const gross = grossSubtotalInr(preview);
  const net = preview.final_amount_inr;
  const ppwNet = effectiveNetPricePerWattInr(systemKw, net);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        line_items: lines,
        system_kw: systemKw,
        manual_final_override: manualFinal
      };
      if (manualFinal) body.final_amount_inr = manualFinalAmt;

      const res = await fetch(`/api/proposals/${proposalId}/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = (await res.json()) as { ok?: boolean; pricing?: ProposalPricingRow; error?: string };
      if (!res.ok || !j.ok || !j.pricing) {
        throw new Error(j.error || labels.saveFailed);
      }
      onSaved?.(j.pricing);
      toast.push({ tone: "success", title: labels.saved });
    } catch (e) {
      toast.push({ tone: "error", title: labels.saveFailed, description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  }

  function updateLine(id: string, patch: Partial<PricingLineItem>) {
    setLines((prev) => prev.map((L) => (L.id === id ? { ...L, ...patch } : L)));
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((L) => L.id !== id)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        id: newPricingLineId(),
        kind: "custom",
        label: defaultLabelForKind("custom"),
        brand: "",
        quantity: 1,
        unit_rate_inr: 0,
        catalog_category: defaultCatalogCategoryForLineKind("custom")
      }
    ]);
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-b from-white/98 to-slate-50/90 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/10 dark:from-[#0c1017] dark:to-[#080b10]",
        className
      )}
    >
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-teal-600/10 via-transparent to-emerald-600/10 px-5 py-4 dark:border-white/10">
        <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">{labels.title}</h2>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">{labels.subtitle}</p>
        <div className="mt-4 max-w-xs">
          <FloatingLabelInput
            label={labels.systemSize}
            inputMode="decimal"
            value={String(systemKw)}
            onChange={(e) => setSystemKw(num(e.target.value))}
            className="h-12 rounded-xl border-slate-200 bg-white/90 dark:border-white/10 dark:bg-white/5"
          />
        </div>
      </div>

      <div className="overflow-x-auto px-2 pb-2 sm:px-4">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="sticky top-0 bg-white/95 px-2 py-3 dark:bg-[#0c1017]/95">{labels.componentCol}</th>
              <th className="sticky top-0 bg-white/95 px-2 py-3 dark:bg-[#0c1017]/95">{labels.brandCol}</th>
              <th className="sticky top-0 w-20 bg-white/95 px-2 py-3 dark:bg-[#0c1017]/95">{labels.qtyCol}</th>
              <th className="sticky top-0 w-28 bg-white/95 px-2 py-3 dark:bg-[#0c1017]/95">{labels.rateCol}</th>
              <th className="sticky top-0 w-28 bg-white/95 px-2 py-3 dark:bg-[#0c1017]/95">{labels.totalCol}</th>
              <th className="sticky top-0 w-12 bg-white/95 px-1 py-3 dark:bg-[#0c1017]/95" aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {lines.map((L, idx) => {
              const total = lineItemTotalInr(L);
              const brandList = L.kind === "inverter" ? INVERTER_BRAND_PRESETS : PANEL_BRAND_PRESETS;
              const showPanelList = L.kind === "panels" || L.kind === "inverter";
              return (
                <tr
                  key={L.id}
                  className={cn(
                    "border-b border-slate-100/90 dark:border-white/[0.06]",
                    idx % 2 === 0 ? "bg-white/40 dark:bg-white/[0.02]" : ""
                  )}
                >
                  <td className="px-2 py-2 align-top">
                    <div className="flex flex-col gap-1.5">
                      <FloatingLabelSelect
                        label={labels.lineCategory}
                        value={L.kind}
                        onChange={(e) => {
                          const k = e.target.value as PricingLineKind;
                          updateLine(L.id, {
                            kind: k,
                            label: defaultLabelForKind(k),
                            catalog_category: defaultCatalogCategoryForLineKind(k)
                          });
                        }}
                        className="h-10 rounded-lg border-slate-200 text-xs font-bold dark:border-white/10"
                        aria-label={labels.componentCol}
                      >
                        {PRICING_LINE_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {t(`proposals_lineKind_${k}`)}
                          </option>
                        ))}
                      </FloatingLabelSelect>
                      <input
                        type="text"
                        value={L.label}
                        onChange={(e) => updateLine(L.id, { label: e.target.value })}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none ring-teal-500/30 focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                        placeholder={labels.lineDesc}
                        aria-label={labels.lineDesc}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="text"
                      list={showPanelList ? `brands-${L.id}` : undefined}
                      value={L.brand}
                      onChange={(e) => updateLine(L.id, { brand: e.target.value })}
                      className="h-10 w-full min-w-[6rem] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold dark:border-white/10 dark:bg-white/5"
                      placeholder="—"
                    />
                    {showPanelList ? (
                      <datalist id={`brands-${L.id}`}>
                        {brandList.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={String(L.quantity)}
                      onChange={(e) => updateLine(L.id, { quantity: num(e.target.value) })}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-xs font-bold tabular-nums dark:border-white/10 dark:bg-white/5"
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={String(L.unit_rate_inr)}
                      onChange={(e) => updateLine(L.id, { unit_rate_inr: num(e.target.value) })}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-xs font-bold tabular-nums dark:border-white/10 dark:bg-white/5"
                    />
                  </td>
                  <td className="px-2 py-2 align-middle text-right">
                    <span className="text-sm font-black tabular-nums text-slate-900 dark:text-slate-100">
                      ₹{total.toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="px-1 py-2 align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-slate-400 hover:text-rose-600"
                      disabled={lines.length <= 1}
                      onClick={() => removeLine(L.id)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 dark:border-white/10">
        <Button type="button" variant="outline" size="sm" className="gap-1.5 font-bold" onClick={addLine}>
          <Plus className="h-4 w-4" />
          {labels.addLine}
        </Button>
      </div>

      <div className="grid gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-sm dark:border-white/10 dark:bg-[#0f1419]/90">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{labels.grossTotal}</p>
          <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">₹{gross.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-sm dark:border-white/10 dark:bg-[#0f1419]/90">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{labels.subsidyLabel}</p>
          <p className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-400">
            −₹{Math.round(preview.subsidy_inr).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-sm dark:border-white/10 dark:bg-[#0f1419]/90">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{labels.discountLabel}</p>
          <p className="mt-1 text-lg font-black text-amber-700 dark:text-amber-400">
            −₹{Math.round(preview.discount_inr).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50 to-white p-3 shadow-sm dark:border-teal-500/25 dark:from-teal-950/40 dark:to-[#0f1419]">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-teal-800 dark:text-teal-200">{labels.netPayable}</p>
          <p className="mt-1 text-xl font-black text-teal-800 dark:text-teal-200">₹{Math.round(net).toLocaleString("en-IN")}</p>
          <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            {labels.ppwGross}{" "}
            <span className="tabular-nums text-slate-900 dark:text-slate-100">₹{preview.price_per_watt_inr.toLocaleString("en-IN")}/W</span>
          </p>
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            {labels.ppwNet}{" "}
            <span className="tabular-nums text-slate-900 dark:text-slate-100">₹{ppwNet.toLocaleString("en-IN")}/W</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            checked={manualFinal}
            onChange={(e) => {
              const on = e.target.checked;
              if (on) {
                const autoNet = proposalPricingRowFromLineItems(
                  { ...initial, system_kw: systemKw, manual_final_override: false, final_amount_inr: initial.final_amount_inr },
                  lines,
                  { system_kw: systemKw, manual_final_override: false }
                ).final_amount_inr;
                setManualFinalAmt(autoNet);
              }
              setManualFinal(on);
            }}
          />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{labels.manualFinal}</span>
        </label>
        {manualFinal ? (
          <FloatingLabelInput
            label={labels.netPayable}
            inputMode="decimal"
            value={String(manualFinalAmt)}
            onChange={(e) => setManualFinalAmt(num(e.target.value))}
            className="h-12 max-w-xs rounded-xl"
          />
        ) : null}
        <Button type="button" variant="emeraldCta" size="lg" className="min-w-[10rem] shrink-0 sm:ml-auto" disabled={saving} onClick={() => void save()}>
          {saving ? labels.saving : labels.save}
        </Button>
      </div>
    </section>
  );
}
