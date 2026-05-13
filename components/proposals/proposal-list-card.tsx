"use client";

import { ProposalStatusBadge } from "@/components/proposal-status-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-center";
import type { ProposalStatus } from "@/lib/proposal-status";
import { cn } from "@/lib/utils";
import { ExternalLink, FileDown, MessageCircle, PencilLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type ProposalListCardProps = {
  id: string;
  customerName: string;
  generatedAt: string;
  systemKw: number;
  finalInr: number | null;
  panelBrand: string | null;
  annualSavingInr: number | null;
  status: ProposalStatus;
  labels: {
    kw: string;
    editPricing: string;
    openProposal: string;
    pdfQuote: string;
    send: string;
    comingSoon: string;
    panelBrand: string;
    estSavingMo: string;
    netPayable: string;
    statusLabel: (s: ProposalStatus) => string;
  };
};

function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase() || "?";
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export function ProposalListCard({
  id,
  customerName,
  generatedAt,
  systemKw,
  finalInr,
  panelBrand,
  annualSavingInr,
  status,
  labels
}: ProposalListCardProps) {
  const router = useRouter();
  const toast = useToast();
  const manageHref = `/proposals/${id}`;
  const savingMo =
    annualSavingInr != null && Number.isFinite(annualSavingInr) ? Math.round(annualSavingInr / 12) : null;

  function soon(feature: string) {
    toast.info(labels.comingSoon, feature);
  }

  return (
    <article
      className={cn(
        "group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition",
        "hover:border-teal-300/80 hover:shadow-md dark:border-white/10 dark:bg-[#0f1419]/95 dark:hover:border-emerald-500/30"
      )}
    >
      <button
        type="button"
        onClick={() => router.push(manageHref)}
        className="flex w-full min-w-0 flex-col gap-2.5 rounded-xl p-1 text-left transition hover:bg-slate-50/80 dark:hover:bg-white/[0.04]"
      >
        <div className="flex items-start gap-2.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-xs font-black text-white shadow-md"
            aria-hidden
          >
            {customerInitials(customerName)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">{customerName}</p>
              <ProposalStatusBadge status={status} label={labels.statusLabel(status)} className="shrink-0" />
            </div>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {formatShortDate(generatedAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span>
            <span className="text-slate-400 dark:text-slate-500">{labels.kw}: </span>
            <span className="tabular-nums text-slate-900 dark:text-slate-100">{systemKw}</span>
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="min-w-0 truncate">
            <span className="text-slate-400 dark:text-slate-500">{labels.panelBrand}: </span>
            {panelBrand ?? "—"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50/90 px-2.5 py-2 dark:bg-white/[0.05]">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {labels.netPayable}
            </p>
            <p className="mt-0.5 text-sm font-black tabular-nums text-teal-800 dark:text-emerald-300">
              {finalInr != null ? `₹${Math.round(finalInr).toLocaleString("en-IN")}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {labels.estSavingMo}
            </p>
            <p className="mt-0.5 text-sm font-black tabular-nums text-slate-900 dark:text-slate-100">
              {savingMo != null ? `₹${savingMo.toLocaleString("en-IN")}` : "—"}
            </p>
          </div>
        </div>
      </button>

      <div
        className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2.5 dark:border-white/[0.06] sm:grid-cols-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button asChild type="button" size="sm" variant="emeraldCta" className="h-8 gap-1 text-[10px] font-bold">
          <Link href={manageHref}>
            <PencilLine className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            {labels.editPricing}
          </Link>
        </Button>
        <Button asChild type="button" size="sm" variant="secondary" className="h-8 gap-1 text-[10px] font-bold">
          <Link href={`/proposal/${id}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            {labels.openProposal}
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-[10px] font-bold"
          onClick={() => soon(labels.pdfQuote)}
        >
          <FileDown className="h-3 w-3 shrink-0" aria-hidden />
          {labels.pdfQuote}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-[10px] font-bold"
          onClick={() => soon(labels.send)}
        >
          <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
          {labels.send}
        </Button>
      </div>
    </article>
  );
}
