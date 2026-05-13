"use client";

import { cn } from "@/lib/utils";

export type ProposalCommercialSnapshotBarLabels = {
  snapshotAria: string;
  system: string;
  netPayable: string;
  monthlySaving: string;
  subsidy: string;
  payback: string;
  kWUnit: string;
};

type Metric = { label: string; value: string; emphasize?: boolean };

export function ProposalCommercialSnapshotBar({
  systemKw,
  netInr,
  monthlySavingInr,
  subsidyInr,
  paybackYears,
  labels,
  className
}: {
  systemKw: number;
  netInr: number;
  monthlySavingInr: number;
  subsidyInr: number;
  paybackYears: number;
  labels: ProposalCommercialSnapshotBarLabels;
  className?: string;
}) {
  const payback =
    Number.isFinite(paybackYears) && paybackYears > 0 ? `${paybackYears.toFixed(1)} yrs` : "—";

  const metrics: Metric[] = [
    { label: labels.system, value: `${systemKw} ${labels.kWUnit}` },
    { label: labels.netPayable, value: `₹${Math.round(netInr).toLocaleString("en-IN")}`, emphasize: true },
    { label: labels.monthlySaving, value: `₹${Math.round(monthlySavingInr).toLocaleString("en-IN")}` },
    { label: labels.subsidy, value: `₹${Math.round(subsidyInr).toLocaleString("en-IN")}` },
    { label: labels.payback, value: payback }
  ];

  return (
    <div
      role="region"
      aria-label={labels.snapshotAria}
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-200/80 sm:grid-cols-5 dark:bg-white/[0.08]",
        className
      )}
    >
      {metrics.map((m) => (
        <div
          key={m.label}
          className={cn(
            "min-h-[4.25rem] bg-slate-50/95 px-3 py-3 dark:bg-[#0f1419]/95",
            m.emphasize && "bg-white dark:bg-[#111820]/95"
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{m.label}</p>
          <p
            className={cn(
              "mt-1 text-sm font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50",
              m.emphasize && "text-base font-bold text-teal-800 dark:text-teal-200"
            )}
          >
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}
