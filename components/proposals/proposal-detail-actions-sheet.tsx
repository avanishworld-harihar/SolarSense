"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-center";
import { Archive, Copy, ExternalLink, FileDown, ListTree, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export type ProposalDetailActionsSheetLabels = {
  moreActions: string;
  sheetClose: string;
  openPublic: string;
  pdfQuote: string;
  send: string;
  duplicate: string;
  archive: string;
  jumpToPricing: string;
  comingSoon: string;
};

export function ProposalDetailActionsSheet({
  open,
  onClose,
  proposalId,
  labels,
  primaryIsSend
}: {
  open: boolean;
  onClose: () => void;
  proposalId: string;
  labels: ProposalDetailActionsSheetLabels;
  /** When true, primary on page is Send — surface Open public here; vice versa when false. */
  primaryIsSend: boolean;
}) {
  const toast = useToast();
  const publicHref = `/proposal/${proposalId}`;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function soon(feature: string) {
    toast.info(labels.comingSoon, feature);
    onClose();
  }

  function jumpToPricing() {
    document.getElementById("bom")?.scrollIntoView({ behavior: "smooth", block: "start" });
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={labels.moreActions}
    >
      <button type="button" className="absolute inset-0 bg-slate-950/40" aria-label={labels.sheetClose} onClick={onClose} />
      <div className="relative max-h-[min(85dvh,560px)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-lg dark:border-white/10 dark:bg-[#0f1419] md:max-h-[min(80vh,640px)] md:rounded-2xl md:shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{labels.moreActions}</p>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            onClick={onClose}
            aria-label={labels.sheetClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-1.5">
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full justify-start gap-3 text-sm font-medium text-slate-800 dark:text-slate-100"
            onClick={jumpToPricing}
          >
            <ListTree className="h-4 w-4 shrink-0" aria-hidden />
            {labels.jumpToPricing}
          </Button>

          {primaryIsSend ? (
            <Button asChild variant="ghost" className="h-11 w-full justify-start gap-3 text-sm font-medium">
              <Link href={publicHref} target="_blank" rel="noreferrer" onClick={onClose}>
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                {labels.openPublic}
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full justify-start gap-3 text-sm font-medium"
              onClick={() => soon(labels.send)}
            >
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
              {labels.send}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full justify-start gap-3 text-sm font-medium"
            onClick={() => soon(labels.pdfQuote)}
          >
            <FileDown className="h-4 w-4 shrink-0" aria-hidden />
            {labels.pdfQuote}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full justify-start gap-3 text-sm font-medium"
            onClick={() => soon(labels.duplicate)}
          >
            <Copy className="h-4 w-4 shrink-0" aria-hidden />
            {labels.duplicate}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full justify-start gap-3 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
            onClick={() => soon(labels.archive)}
          >
            <Archive className="h-4 w-4 shrink-0" aria-hidden />
            {labels.archive}
          </Button>
        </div>
      </div>
    </div>
  );
}
