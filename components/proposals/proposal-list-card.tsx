"use client";

import { ProposalStatusBadge } from "@/components/proposal-status-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-center";
import type { ProposalStatus } from "@/lib/proposal-status";
import { cn } from "@/lib/utils";
import { ExternalLink, FileDown, MessageCircle, MoreHorizontal, PencilLine, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
    moreActions: string;
    sheetClose: string;
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
  const publicHref = `/proposal/${id}`;
  const [sheetOpen, setSheetOpen] = useState(false);
  const savingMo =
    annualSavingInr != null && Number.isFinite(annualSavingInr) ? Math.round(annualSavingInr / 12) : null;

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  function soon(feature: string) {
    toast.info(labels.comingSoon, feature);
    setSheetOpen(false);
  }

  return (
    <article
      className={cn(
        "group flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-sm transition",
        "hover:border-teal-300/80 hover:shadow-md dark:border-white/10 dark:bg-[#0f1419]/95 dark:hover:border-emerald-500/30"
      )}
    >
      {/* —— Mobile (< md): spacious card + primary CTA + action sheet —— */}
      <div className="md:hidden">
        <div className="p-4 pb-3">
          <div className="flex items-start gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-sm font-black text-white shadow-md"
              aria-hidden
            >
              {customerInitials(customerName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold leading-snug text-slate-900 dark:text-slate-50">{customerName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ProposalStatusBadge status={status} label={labels.statusLabel(status)} />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{formatShortDate(generatedAt)}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 rounded-2xl bg-slate-50/90 px-4 py-4 dark:bg-white/[0.06]">
            <div className="flex justify-between gap-4 text-sm">
              <span className="font-semibold text-slate-500 dark:text-slate-400">{labels.kw}</span>
              <span className="font-black tabular-nums text-slate-900 dark:text-slate-100">{systemKw}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="font-semibold text-slate-500 dark:text-slate-400">{labels.panelBrand}</span>
              <span className="max-w-[55%] truncate text-right font-bold text-slate-900 dark:text-slate-100">
                {panelBrand ?? "—"}
              </span>
            </div>
            <div className="border-t border-slate-200/80 pt-3 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.netPayable}</p>
              <p className="mt-1 text-xl font-black tabular-nums text-teal-800 dark:text-emerald-300">
                {finalInr != null ? `₹${Math.round(finalInr).toLocaleString("en-IN")}` : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-white/[0.06]">
          <Button asChild type="button" size="lg" variant="emeraldCta" className="min-h-12 flex-1 touch-manipulation text-base font-bold">
            <Link href={publicHref} target="_blank" rel="noreferrer" className="gap-2">
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              {labels.openProposal}
            </Link>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-12 min-w-12 shrink-0 touch-manipulation px-0"
            aria-label={labels.moreActions}
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </div>

      {/* —— Desktop / tablet (md+): denser hub card —— */}
      <div className="hidden md:flex md:flex-col">
        <button
          type="button"
          onClick={() => router.push(manageHref)}
          className="flex w-full min-w-0 flex-col gap-2.5 rounded-xl p-3.5 pb-2 text-left transition hover:bg-slate-50/80 dark:hover:bg-white/[0.04]"
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
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{formatShortDate(generatedAt)}</p>
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
              <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.netPayable}</p>
              <p className="mt-0.5 text-sm font-black tabular-nums text-teal-800 dark:text-emerald-300">
                {finalInr != null ? `₹${Math.round(finalInr).toLocaleString("en-IN")}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.estSavingMo}</p>
              <p className="mt-0.5 text-sm font-black tabular-nums text-slate-900 dark:text-slate-100">
                {savingMo != null ? `₹${savingMo.toLocaleString("en-IN")}` : "—"}
              </p>
            </div>
          </div>
        </button>

        <div
          className="mt-0 grid grid-cols-2 gap-1.5 border-t border-slate-100 px-3 pb-3 pt-2.5 dark:border-white/[0.06] lg:grid-cols-4"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Button asChild type="button" size="sm" variant="emeraldCta" className="h-9 gap-1 text-[10px] font-bold lg:h-8">
            <Link href={manageHref}>
              <PencilLine className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
              {labels.editPricing}
            </Link>
          </Button>
          <Button asChild type="button" size="sm" variant="secondary" className="h-9 gap-1 text-[10px] font-bold lg:h-8">
            <Link href={publicHref} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
              {labels.openProposal}
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1 text-[10px] font-bold lg:h-8"
            onClick={() => soon(labels.pdfQuote)}
          >
            <FileDown className="h-3 w-3 shrink-0" aria-hidden />
            {labels.pdfQuote}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1 text-[10px] font-bold lg:h-8"
            onClick={() => soon(labels.send)}
          >
            <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
            {labels.send}
          </Button>
        </div>
      </div>

      {/* Mobile action sheet */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label={labels.moreActions}>
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            aria-label={labels.sheetClose}
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[min(85dvh,520px)] overflow-y-auto rounded-t-3xl border border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#0f1419]">
            <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-black text-slate-900 dark:text-slate-50">{labels.moreActions}</p>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                onClick={() => setSheetOpen(false)}
                aria-label={labels.sheetClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <Button asChild variant="secondary" className="h-12 w-full touch-manipulation justify-start gap-3 text-base font-bold">
                <Link href={manageHref} onClick={() => setSheetOpen(false)}>
                  <PencilLine className="h-4 w-4 shrink-0" aria-hidden />
                  {labels.editPricing}
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full touch-manipulation justify-start gap-3 text-base font-bold"
                onClick={() => soon(labels.pdfQuote)}
              >
                <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                {labels.pdfQuote}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full touch-manipulation justify-start gap-3 text-base font-bold"
                onClick={() => soon(labels.send)}
              >
                <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                {labels.send}
              </Button>
            </div>
            {savingMo != null ? (
              <p className="mt-4 border-t border-slate-100 pt-4 text-center text-sm font-semibold text-slate-600 dark:border-white/10 dark:text-slate-400">
                <span className="text-slate-500">{labels.estSavingMo}: </span>
                <span className="font-black tabular-nums text-slate-900 dark:text-slate-100">₹{savingMo.toLocaleString("en-IN")}</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
