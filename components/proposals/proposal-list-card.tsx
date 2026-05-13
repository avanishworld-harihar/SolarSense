"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-center";
import { cn } from "@/lib/utils";
import { FileText, MessageCircle, Quote } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type ProposalListCardProps = {
  id: string;
  customerName: string;
  generatedAt: string;
  systemKw: number;
  finalInr: number | null;
  labels: {
    net: string;
    kw: string;
    editPricing: string;
    openProposal: string;
    generateQuote: string;
    send: string;
    comingSoon: string;
    tapHint: string;
  };
};

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export function ProposalListCard({ id, customerName, generatedAt, systemKw, finalInr, labels }: ProposalListCardProps) {
  const router = useRouter();
  const toast = useToast();
  const manageHref = `/proposals/${id}`;

  function soon(feature: string) {
    toast.info(labels.comingSoon, feature);
  }

  return (
    <div
      onClick={() => router.push(manageHref)}
      className={cn(
        "group flex cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border border-white/60 bg-white/90 p-4 text-left shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-teal-200/80 hover:shadow-[0_16px_40px_rgba(15,118,110,0.12)]",
        "dark:border-white/10 dark:bg-[#0f1419]/90 dark:hover:border-emerald-500/35"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md"
          aria-hidden
        >
          <FileText className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-slate-900 dark:text-slate-50">{customerName}</p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {formatShortDate(generatedAt)} · {systemKw} {labels.kw}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">{labels.tapHint}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.net}</p>
        <p className="text-lg font-black text-teal-700 dark:text-emerald-300">
          {finalInr != null ? `₹${Math.round(finalInr).toLocaleString("en-IN")}` : "—"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <Button asChild type="button" size="sm" variant="emeraldCta" className="h-9 flex-1 min-w-[7.5rem] text-xs font-bold sm:flex-none">
          <Link href={manageHref}>{labels.editPricing}</Link>
        </Button>
        <Button asChild type="button" size="sm" variant="secondary" className="h-9 flex-1 min-w-[7.5rem] text-xs font-bold sm:flex-none">
          <Link href={`/proposal/${id}`} target="_blank" rel="noreferrer">
            {labels.openProposal}
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1 text-xs font-bold"
          onClick={() => soon(labels.generateQuote)}
        >
          <Quote className="h-3.5 w-3.5" aria-hidden />
          {labels.generateQuote}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1 text-xs font-bold"
          onClick={() => soon(labels.send)}
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          {labels.send}
        </Button>
      </div>
    </div>
  );
}
