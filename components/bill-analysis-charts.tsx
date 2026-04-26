"use client";

import type { MonthlyUnits, SolarResult } from "@/lib/types";
import type { TariffContext } from "@/lib/tariff-types";
import { DEFAULT_TARIFF_CONTEXT, estimateMonthlyBillBreakdown } from "@/lib/solar-engine";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import type { ParsedBillShape } from "@/lib/bill-parse";

const MONTH_ORDER: (keyof MonthlyUnits)[] = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec"
];

const MONTH_LABEL: Record<keyof MonthlyUnits, string> = {
  jan: "Jan",
  feb: "Feb",
  mar: "Mar",
  apr: "Apr",
  may: "May",
  jun: "Jun",
  jul: "Jul",
  aug: "Aug",
  sep: "Sep",
  oct: "Oct",
  nov: "Nov",
  dec: "Dec"
};

type BillAnalysisChartsProps = {
  monthlyUnits: MonthlyUnits;
  result: SolarResult;
  tariffContext?: TariffContext;
  parsedBill?: ParsedBillShape | null;
  className?: string;
};

function toBillInr(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v);
  const n = Number.parseFloat(String(v).replace(/[₹,\s]/g, "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export function BillAnalysisCharts({ monthlyUnits, result, tariffContext, parsedBill, className }: BillAnalysisChartsProps) {
  const { t } = useLanguage();
  const ctx = tariffContext ?? DEFAULT_TARIFF_CONTEXT;
  const values = MONTH_ORDER.map((k) => Math.max(0, monthlyUnits[k] || 0));
  const maxU = Math.max(...values, 1);
  const annualUnits = result.annualUnits;
  const avgU = annualUnits / 12;
  const breakdown = estimateMonthlyBillBreakdown(avgU, ctx);
  const bTotal = breakdown.total || 1;
  const pct = (n: number) => `${Math.round((n / bTotal) * 100)}%`;
  const yearlyNow = result.currentMonthlyBill * 12;
  const yearlyAfter = result.newMonthlyBill * 12;
  const billFixed = toBillInr(parsedBill?.fixed_charges_inr);
  const billEnergy = toBillInr(parsedBill?.energy_charges_inr);
  const billTotal = toBillInr(parsedBill?.total_amount_payable_inr);
  const modeledDelta = billTotal != null ? billTotal - breakdown.total : null;
  const costPerUnit =
    annualUnits > 0 && avgU > 0 ? Math.round((result.currentMonthlyBill / avgU) * 100) / 100 : 0;

  const tariffSourceLabel = ctx.source === "supabase" ? t("charts_tariffSourceDb") : t("charts_tariffSourceFallback");

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-white sm:text-sm">
          {t("proposal_billAnalysisTitle")}
        </h3>
        <p className="mt-1 text-[11px] font-medium leading-snug text-slate-600 dark:text-[#8B949E] sm:text-xs">
          {t("proposal_billAnalysisSub")}
        </p>
        <p className="mt-1 text-[10px] font-semibold text-indigo-700 dark:text-teal-300 dark:drop-shadow-[0_0_12px_rgba(45,212,191,0.35)] sm:text-[11px]">
          {t("charts_tariffLine", { label: ctx.discomLabel, source: tariffSourceLabel })}
        </p>
      </div>

      {annualUnits === 0 && (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-[11px] font-semibold leading-snug text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100 sm:text-xs">
          {t("proposal_billAnalysisIdle")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="ss-card-subtle p-3 dark:ss-dashboard-glass dark:shadow-none sm:rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#8B949E]">{t("charts_annualUnits")}</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-brand-800 dark:text-white sm:text-xl">
            {annualUnits.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="ss-card-subtle p-3 dark:ss-dashboard-glass dark:shadow-none sm:rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#8B949E]">{t("charts_avgMonthlyBill")}</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-brand-800 dark:text-white sm:text-xl">
            ₹{result.currentMonthlyBill.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="ss-card-subtle p-3 dark:ss-dashboard-glass dark:shadow-none sm:rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#8B949E]">{t("charts_costPerUnitLabel")}</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-brand-800 dark:text-white sm:text-xl">
            {costPerUnit > 0 ? `₹${costPerUnit}` : "—"}
          </p>
        </div>
        <div className="ss-card-subtle p-3 dark:ss-dashboard-glass dark:shadow-none sm:rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#8B949E]">{t("charts_recommendedSolarKpi")}</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-solar-600 dark:bg-gradient-to-r dark:from-emerald-300 dark:via-teal-300 dark:to-cyan-200 dark:bg-clip-text dark:text-transparent sm:text-xl">
            {result.solarKw} kW
          </p>
        </div>
      </div>

      <div className="ss-card p-4 dark:ss-dashboard-glass dark:shadow-none sm:p-5">
        <p className="text-xs font-bold text-brand-800 dark:text-white sm:text-sm">{t("charts_monthlyBarTitle")}</p>
        <p className="mt-0.5 text-[11px] font-medium text-slate-600 dark:text-[#8B949E]">{t("charts_monthlyBarSub")}</p>
        <div className="relative mt-4 rounded-2xl bg-slate-100/90 p-3 pt-2 ring-1 ring-slate-200/80 dark:bg-[#050608] dark:ring-white/[0.08] sm:p-4">
          <div
            className="pointer-events-none absolute inset-3 rounded-xl dark:hidden"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(to top, rgba(15,23,42,0.05) 1px, transparent 1px)",
              backgroundSize: "8.33% 25%"
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-3 hidden rounded-xl dark:block"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(to top, rgba(255,255,255,0.028) 1px, transparent 1px)",
              backgroundSize: "8.33% 25%"
            }}
            aria-hidden
          />
          <div className="relative flex h-40 items-end justify-between gap-0.5 sm:h-48 sm:gap-1">
            {MONTH_ORDER.map((k, i) => {
              const v = values[i];
              const h = Math.max(4, (v / maxU) * 100);
              return (
                <div key={k} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div className="flex h-[115px] w-full max-w-[2.25rem] items-end sm:h-[132px]">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-sky-400 shadow-sm transition-all hover:from-brand-500 hover:to-sky-300 dark:from-emerald-500 dark:via-teal-400 dark:to-cyan-300 dark:shadow-[0_0_18px_rgba(45,212,191,0.48)] dark:hover:from-emerald-400 dark:hover:via-teal-300 dark:hover:to-cyan-200"
                      style={{ height: `${h}%` }}
                      title={`${MONTH_LABEL[k]}: ${v} ${t("charts_unitsSuffix")}`}
                    />
                  </div>
                  <span className="text-[8px] font-bold text-slate-600 dark:text-[#8B949E] sm:text-[9px]">{MONTH_LABEL[k]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ss-card p-4 dark:ss-dashboard-glass dark:shadow-none sm:p-5">
        <p className="text-xs font-bold text-brand-800 dark:text-white sm:text-sm">{t("charts_billSlabTitle")}</p>
        <p className="mt-0.5 text-[11px] font-medium text-slate-600 dark:text-[#8B949E]">{t("charts_billSlabSub")}</p>
        <div className="mt-4 h-8 w-full overflow-hidden rounded-full ring-1 ring-white/60 dark:ring-white/15">
          <div className="flex h-full w-full">
            <div
              className="h-full bg-gradient-to-b from-sky-500 to-sky-600"
              style={{ width: pct(breakdown.energy) }}
              title={`Energy ₹${breakdown.energy}`}
            />
            <div
              className="h-full bg-gradient-to-b from-amber-400 to-amber-500"
              style={{ width: pct(breakdown.fixed) }}
              title={`Fixed ₹${breakdown.fixed}`}
            />
            <div
              className="h-full bg-gradient-to-b from-violet-500 to-violet-600"
              style={{ width: pct(breakdown.duty) }}
              title={`Duty ₹${breakdown.duty}`}
            />
            <div
              className="h-full bg-gradient-to-b from-emerald-500 to-emerald-600"
              style={{ width: pct(breakdown.fuel) }}
              title={`Fuel ₹${breakdown.fuel}`}
            />
          </div>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-700 dark:text-muted-foreground sm:text-xs">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" /> Energy ₹{breakdown.energy.toLocaleString("en-IN")} (
            {pct(breakdown.energy)})
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Fixed ₹{breakdown.fixed.toLocaleString("en-IN")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" /> Duty ₹{breakdown.duty.toLocaleString("en-IN")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Fuel ₹{breakdown.fuel.toLocaleString("en-IN")}
          </li>
        </ul>
      </div>

      {(billFixed != null || billEnergy != null || billTotal != null) && (
        <div className="ss-card p-4 dark:ss-dashboard-glass dark:shadow-none sm:p-5">
          <p className="text-xs font-bold text-brand-800 dark:text-white sm:text-sm">Bill Amount Breakdown (Smart Match)</p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-600 dark:text-[#8B949E]">
            Actual bill amounts vs SOL.52 tariff model estimate.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#8B949E]">Fixed Charges</p>
              <p className="mt-1 text-lg font-extrabold text-brand-800 dark:text-white">₹{(billFixed ?? 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#8B949E]">Energy Charges</p>
              <p className="mt-1 text-lg font-extrabold text-brand-800 dark:text-white">₹{(billEnergy ?? 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#8B949E]">Total Bill</p>
              <p className="mt-1 text-lg font-extrabold text-brand-800 dark:text-white">₹{(billTotal ?? 0).toLocaleString("en-IN")}</p>
            </div>
          </div>
          {modeledDelta != null && (
            <p
              className={cn(
                "mt-3 text-[11px] font-semibold sm:text-xs",
                Math.abs(modeledDelta) <= 250 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
              )}
            >
              Model vs bill delta: {modeledDelta >= 0 ? "+" : ""}₹{modeledDelta.toLocaleString("en-IN")} (estimated).
            </p>
          )}
        </div>
      )}

      <div className="ss-card border-red-200/45 bg-gradient-to-br from-red-50/85 to-orange-50/70 p-4 dark:border-red-900/40 dark:from-red-950/50 dark:to-orange-950/35 sm:p-5">
        <p className="text-xs font-extrabold text-red-900 dark:text-red-200 sm:text-sm">{t("charts_hiddenTitle")}</p>
        <p className="mt-1 text-[11px] font-medium leading-snug text-red-900/80 dark:text-red-200/85 sm:text-xs">{t("charts_hiddenSub")}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="ss-card-subtle border-red-200/60 p-4 dark:border-red-800/40 dark:bg-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">{t("charts_yearlyGrid")}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-red-700 dark:text-red-200 sm:text-3xl">
              ₹{yearlyNow.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="ss-card-subtle border-solar-200/60 p-4 dark:border-solar-800/40 dark:bg-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-solar-800 dark:text-solar-300">{t("charts_yearlySolar")}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-solar-700 dark:text-solar-300 sm:text-3xl">
              ₹{yearlyAfter.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800/90">
          <div
            className="h-full rounded-full bg-gradient-to-r from-solar-500 to-brand-500 transition-all duration-500"
            style={{
              width: `${yearlyNow > 0 ? Math.min(100, Math.round((1 - yearlyAfter / yearlyNow) * 100)) : 0}%`
            }}
            title={t("charts_estimatedReductionTitle")}
          />
        </div>
        <p className="mt-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400 sm:text-xs">{t("charts_reductionNote")}</p>
      </div>
    </div>
  );
}
