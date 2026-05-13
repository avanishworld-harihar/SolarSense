"use client";

import { Button } from "@/components/ui/button";
import { FloatingLabelInput, FloatingLabelSelect } from "@/components/ui/floating-label-input";
import { useToast } from "@/components/ui/toast-center";
import type { PricingLineKind } from "@/lib/pricing-line-kinds";
import { PRICING_LINE_KINDS } from "@/lib/pricing-line-kinds";
import { defaultCatalogCategoryForLineKind } from "@/lib/epc-component-catalog";
import {
  defaultLabelForKind,
  defaultUnitForKind,
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
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type ProposalPricingConfiguratorLabels = {
  title: string;
  subtitle: string;
  systemSize: string;
  categoryCol: string;
  itemCol: string;
  brandCol: string;
  qtyCol: string;
  unitCol: string;
  rateCol: string;
  amountCol: string;
  notesCol: string;
  addLine: string;
  summaryGross: string;
  summarySubsidy: string;
  summaryDiscount: string;
  summaryNet: string;
  ppwGross: string;
  ppwNet: string;
  manualFinal: string;
  save: string;
  saving: string;
  saved: string;
  saveFailed: string;
  removeLine: string;
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

function SummaryChip({
  label,
  value,
  valueClass
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-[6.5rem] flex-1 rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-2 dark:border-white/10 dark:bg-[#0f1419]/90">
      <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn("mt-0.5 text-sm font-black tabular-nums text-slate-900 dark:text-slate-50", valueClass)}>{value}</p>
    </div>
  );
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
        unit: defaultUnitForKind("custom"),
        catalog_category: defaultCatalogCategoryForLineKind("custom")
      }
    ]);
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-white/10 dark:bg-[#0c1017]/90",
        className
      )}
    >
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-900 px-4 py-3 text-white dark:from-[#0b1220] dark:via-[#0f172a] dark:to-emerald-950/90">
        <h2 className="text-base font-black tracking-tight">{labels.title}</h2>
        <p className="mt-0.5 text-xs font-medium text-teal-100/90">{labels.subtitle}</p>
        <div className="mt-3 max-w-[11rem]">
          <FloatingLabelInput
            label={labels.systemSize}
            inputMode="decimal"
            value={String(systemKw)}
            onChange={(e) => setSystemKw(num(e.target.value))}
            className="h-10 rounded-lg border-white/20 bg-white/10 text-white placeholder:text-white/50"
          />
        </div>
      </div>

      <div className="hidden overflow-x-auto border-b border-slate-100 dark:border-white/10 lg:block">
        <table className="w-full min-w-[72rem] border-separate border-spacing-0 text-[12px]">
          <thead>
            <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="sticky top-0 bg-slate-50 px-2 py-2.5 dark:bg-[#0a0e14]">{labels.categoryCol}</th>
              <th className="sticky top-0 bg-slate-50 px-2 py-2.5 dark:bg-[#0a0e14]">{labels.itemCol}</th>
              <th className="sticky top-0 bg-slate-50 px-2 py-2.5 dark:bg-[#0a0e14]">{labels.brandCol}</th>
              <th className="sticky top-0 bg-slate-50 px-2 py-2.5 dark:bg-[#0a0e14]">{labels.qtyCol}</th>
              <th className="sticky top-0 w-16 bg-slate-50 px-2 py-2.5 dark:bg-[#0a0e14]">{labels.unitCol}</th>
              <th className="sticky top-0 w-24 bg-slate-50 px-2 py-2.5 dark:bg-[#0a0e14]">{labels.rateCol}</th>
              <th className="sticky top-0 w-24 bg-slate-50 px-2 py-2.5 text-right dark:bg-[#0a0e14]">{labels.amountCol}</th>
              <th className="sticky top-0 min-w-[7rem] bg-slate-50 px-2 py-2.5 dark:bg-[#0a0e14]">{labels.notesCol}</th>
              <th className="sticky top-0 w-10 bg-slate-50 px-1 py-2.5 dark:bg-[#0a0e14]" aria-label="Remove" />
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
                    "border-b border-slate-100 dark:border-white/[0.06]",
                    idx % 2 === 0 ? "bg-white dark:bg-[#0c1017]" : "bg-slate-50/40 dark:bg-[#080b10]/80"
                  )}
                >
                  <td className="px-2 py-1.5 align-top">
                    <FloatingLabelSelect
                      label={labels.categoryCol}
                      value={L.kind}
                      onChange={(e) => {
                        const k = e.target.value as PricingLineKind;
                        updateLine(L.id, {
                          kind: k,
                          label: defaultLabelForKind(k),
                          catalog_category: defaultCatalogCategoryForLineKind(k),
                          unit: defaultUnitForKind(k)
                        });
                      }}
                      className="h-9 rounded-md border-slate-200 text-[11px] font-bold dark:border-white/10"
                      aria-label={labels.categoryCol}
                    >
                      {PRICING_LINE_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {t(`proposals_lineKind_${k}`)}
                        </option>
                      ))}
                    </FloatingLabelSelect>
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <input
                      type="text"
                      value={L.label}
                      onChange={(e) => updateLine(L.id, { label: e.target.value })}
                      className="h-9 w-full min-w-[7rem] rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold dark:border-white/10 dark:bg-white/5"
                      placeholder="—"
                      aria-label={labels.itemCol}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <input
                      type="text"
                      list={showPanelList ? `brands-d-${L.id}` : undefined}
                      value={L.brand}
                      onChange={(e) => updateLine(L.id, { brand: e.target.value })}
                      className="h-9 w-full min-w-[5rem] rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold dark:border-white/10 dark:bg-white/5"
                      placeholder="—"
                    />
                    {showPanelList ? (
                      <datalist id={`brands-d-${L.id}`}>
                        {brandList.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={String(L.quantity)}
                      onChange={(e) => updateLine(L.id, { quantity: num(e.target.value) })}
                      className="h-9 w-full max-w-[4.5rem] rounded-md border border-slate-200 bg-white px-1.5 text-right text-[11px] font-bold tabular-nums dark:border-white/10 dark:bg-white/5"
                    />
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <input
                      type="text"
                      value={L.unit ?? defaultUnitForKind(L.kind)}
                      onChange={(e) => updateLine(L.id, { unit: e.target.value.slice(0, 32) })}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-semibold dark:border-white/10 dark:bg-white/5"
                    />
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={String(L.unit_rate_inr)}
                      onChange={(e) => updateLine(L.id, { unit_rate_inr: num(e.target.value) })}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-1.5 text-right text-[11px] font-bold tabular-nums dark:border-white/10 dark:bg-white/5"
                    />
                  </td>
                  <td className="px-2 py-1.5 align-middle text-right">
                    <span className="text-[12px] font-black tabular-nums text-slate-900 dark:text-slate-100">
                      ₹{total.toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <input
                      type="text"
                      value={L.notes ?? ""}
                      onChange={(e) => updateLine(L.id, { notes: e.target.value.slice(0, 500) })}
                      className="h-9 w-full min-w-[6rem] rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium dark:border-white/10 dark:bg-white/5"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-1 py-1.5 align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-rose-600"
                      disabled={lines.length <= 1}
                      onClick={() => removeLine(L.id)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 border-b border-slate-100 dark:divide-white/10 dark:border-white/10 lg:hidden">
        {lines.map((L) => {
          const total = lineItemTotalInr(L);
          const brandList = L.kind === "inverter" ? INVERTER_BRAND_PRESETS : PANEL_BRAND_PRESETS;
          const showPanelList = L.kind === "panels" || L.kind === "inverter";
          const kindLabel = t(`proposals_lineKind_${L.kind}`);
          return (
            <details key={`m-${L.id}`} className="group bg-white open:bg-slate-50/80 dark:bg-[#0c1017] dark:open:bg-white/[0.03]">
              <summary className="flex cursor-pointer list-none touch-manipulation items-center justify-between gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-base font-black text-slate-900 dark:text-slate-50">{L.label || kindLabel}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{kindLabel}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="text-lg font-black tabular-nums text-teal-800 dark:text-emerald-300">₹{total.toLocaleString("en-IN")}</p>
                    <p className="text-[11px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
                      {L.quantity} × ₹{Number(L.unit_rate_inr).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </div>
              </summary>
              <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-white/10">
                <FloatingLabelSelect
                  label={labels.categoryCol}
                  value={L.kind}
                  onChange={(e) => {
                    const k = e.target.value as PricingLineKind;
                    updateLine(L.id, {
                      kind: k,
                      label: defaultLabelForKind(k),
                      catalog_category: defaultCatalogCategoryForLineKind(k),
                      unit: defaultUnitForKind(k)
                    });
                  }}
                  className="h-11 rounded-xl border-slate-200 text-sm font-bold dark:border-white/10"
                  aria-label={labels.categoryCol}
                >
                  {PRICING_LINE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {t(`proposals_lineKind_${k}`)}
                    </option>
                  ))}
                </FloatingLabelSelect>
                <FloatingLabelInput
                  label={labels.itemCol}
                  value={L.label}
                  onChange={(e) => updateLine(L.id, { label: e.target.value })}
                  className="h-11 rounded-xl text-sm"
                />
                <FloatingLabelInput
                  label={labels.brandCol}
                  value={L.brand}
                  onChange={(e) => updateLine(L.id, { brand: e.target.value })}
                  list={showPanelList ? `brands-m-${L.id}` : undefined}
                  className="h-11 rounded-xl text-sm"
                />
                {showPanelList ? (
                  <datalist id={`brands-m-${L.id}`}>
                    {brandList.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <FloatingLabelInput
                    label={labels.qtyCol}
                    inputMode="decimal"
                    value={String(L.quantity)}
                    onChange={(e) => updateLine(L.id, { quantity: num(e.target.value) })}
                    className="h-11 rounded-xl text-sm"
                  />
                  <FloatingLabelInput
                    label={labels.unitCol}
                    value={L.unit ?? defaultUnitForKind(L.kind)}
                    onChange={(e) => updateLine(L.id, { unit: e.target.value.slice(0, 32) })}
                    className="h-11 rounded-xl text-sm"
                  />
                </div>
                <FloatingLabelInput
                  label={labels.rateCol}
                  inputMode="decimal"
                  value={String(L.unit_rate_inr)}
                  onChange={(e) => updateLine(L.id, { unit_rate_inr: num(e.target.value) })}
                  className="h-11 rounded-xl text-sm"
                />
                <FloatingLabelInput
                  label={labels.notesCol}
                  value={L.notes ?? ""}
                  onChange={(e) => updateLine(L.id, { notes: e.target.value.slice(0, 500) })}
                  className="h-11 rounded-xl text-sm"
                />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-600 dark:text-slate-300">{t("proposals_lineCategory")}: </span>
                  {L.catalog_category ?? "—"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full touch-manipulation font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  disabled={lines.length <= 1}
                  onClick={() => removeLine(L.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                  {labels.removeLine}
                </Button>
              </div>
            </details>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-white/10">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-[11px] font-bold max-lg:min-h-11 max-lg:w-full max-lg:justify-center max-lg:text-sm"
          onClick={addLine}
        >
          <Plus className="h-3.5 w-3.5" />
          {labels.addLine}
        </Button>
      </div>

      <div className="flex flex-col flex-wrap gap-2 border-b border-slate-100 bg-slate-50/50 px-3 py-3 sm:flex-row dark:border-white/10 dark:bg-white/[0.02]">
        <SummaryChip label={labels.summaryGross} value={`₹${gross.toLocaleString("en-IN")}`} />
        <SummaryChip
          label={labels.summarySubsidy}
          value={`−₹${Math.round(preview.subsidy_inr).toLocaleString("en-IN")}`}
          valueClass="text-emerald-700 dark:text-emerald-400"
        />
        <SummaryChip
          label={labels.summaryDiscount}
          value={`−₹${Math.round(preview.discount_inr).toLocaleString("en-IN")}`}
          valueClass="text-amber-800 dark:text-amber-300"
        />
        <SummaryChip
          label={labels.summaryNet}
          value={`₹${Math.round(net).toLocaleString("en-IN")}`}
          valueClass="text-teal-800 dark:text-teal-200"
        />
        <div className="min-w-[10rem] flex-1 rounded-xl border border-teal-200/80 bg-teal-50/80 px-2.5 py-2 dark:border-teal-500/25 dark:bg-teal-950/30">
          <p className="text-[9px] font-extrabold uppercase tracking-wide text-teal-900/80 dark:text-teal-200/90">
            {labels.ppwGross} / {labels.ppwNet}
          </p>
          <p className="mt-0.5 text-[11px] font-bold tabular-nums text-slate-900 dark:text-slate-100">
            ₹{preview.price_per_watt_inr.toLocaleString("en-IN")}/W gross · ₹{ppwNet.toLocaleString("en-IN")}/W net
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600"
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
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{labels.manualFinal}</span>
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {manualFinal ? (
            <FloatingLabelInput
              label={labels.summaryNet}
              inputMode="decimal"
              value={String(manualFinalAmt)}
              onChange={(e) => setManualFinalAmt(num(e.target.value))}
              className="h-10 max-w-[10rem] rounded-lg text-[12px]"
            />
          ) : null}
          <Button type="button" variant="emeraldCta" size="default" className="min-w-[8.5rem] font-bold" disabled={saving} onClick={() => void save()}>
            {saving ? labels.saving : labels.save}
          </Button>
        </div>
      </div>
    </section>
  );
}
