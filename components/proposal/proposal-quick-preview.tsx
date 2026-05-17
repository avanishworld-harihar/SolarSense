"use client";

import { cn } from "@/lib/utils";
import { Globe, Sparkles } from "lucide-react";

export function ProposalQuickPreview({
  customerName,
  city,
  discom,
  systemKw,
  annualSavingsInr,
  netCostInr,
  paybackLabel,
  billOptionalHint,
  onGenerate,
  busy
}: {
  customerName: string;
  city?: string;
  discom?: string;
  systemKw: number;
  annualSavingsInr: number;
  netCostInr: number;
  paybackLabel: string;
  billOptionalHint: string;
  onGenerate: () => void;
  busy?: boolean;
}) {
  const loc = [city, discom].filter(Boolean).join(" · ");

  return (
    <section className="proposal-quick-preview overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-teal-50/40 p-5 shadow-sm dark:border-indigo-500/25 dark:from-indigo-950/40 dark:via-[#0c1017] dark:to-teal-950/20 sm:p-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-800 ring-1 ring-indigo-200/80 dark:bg-white/10 dark:text-indigo-200 dark:ring-indigo-500/30">
        <Sparkles className="h-3 w-3" aria-hidden />
        Ready to share
      </span>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-700/80 dark:text-indigo-300/90">
        {billOptionalHint}
      </p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">{customerName}</h2>
      {loc ? <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">{loc}</p> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="System" value={`${systemKw} kW`} accent />
        <Metric label="Annual saving" value={`₹${Math.round(annualSavingsInr).toLocaleString("en-IN")}`} />
        <Metric label="Net cost" value={`₹${Math.round(netCostInr).toLocaleString("en-IN")}`} sub={paybackLabel} />
      </div>

      <button
        type="button"
        className={cn(
          "ss-cta-primary mt-6 w-full gap-2 sm:w-auto sm:min-w-[240px]",
          busy && "pointer-events-none opacity-70"
        )}
        disabled={busy}
        onClick={onGenerate}
      >
        <Globe className="h-4 w-4 shrink-0" aria-hidden />
        {busy ? "Creating proposal…" : "Generate & open proposal"}
      </button>
    </section>
  );
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-extrabold tabular-nums sm:text-xl",
          accent ? "text-indigo-700 dark:text-indigo-300" : "text-slate-900 dark:text-slate-50"
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">{sub}</p> : null}
    </div>
  );
}
