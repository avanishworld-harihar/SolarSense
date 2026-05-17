"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-center";
import {
  deleteProposalById,
  downloadProposalPpt,
  markProposalSent,
  openWhatsAppWithProposal,
  type ProposalShareMetrics
} from "@/lib/proposal-share-actions";
import { Copy, ExternalLink, FileDown, ListTree, MessageCircle, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  deleteProposal?: string;
  deleteConfirm?: string;
  deleteFailed?: string;
  deleteDone?: string;
  sendDone?: string;
  pptFailed?: string;
};

export function ProposalDetailActionsSheet({
  open,
  onClose,
  proposalId,
  labels,
  primaryIsSend,
  shareMetrics,
  onSent
}: {
  open: boolean;
  onClose: () => void;
  proposalId: string;
  labels: ProposalDetailActionsSheetLabels;
  primaryIsSend: boolean;
  shareMetrics: ProposalShareMetrics;
  onSent?: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const publicHref = `/proposal/${proposalId}`;
  const [busy, setBusy] = useState<"send" | "ppt" | "delete" | null>(null);

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

  async function handleSend() {
    setBusy("send");
    try {
      openWhatsAppWithProposal(shareMetrics, proposalId);
      const ok = await markProposalSent(proposalId);
      if (ok) onSent?.();
      toast.success(labels.send, labels.sendDone ?? "WhatsApp opened.");
      onClose();
    } finally {
      setBusy(null);
    }
  }

  async function handlePpt() {
    setBusy("ppt");
    try {
      await downloadProposalPpt(proposalId, shareMetrics.customerName);
      toast.success(labels.pdfQuote, "Download started.");
      onClose();
    } catch (e) {
      toast.error(labels.pptFailed ?? "Download failed", e instanceof Error ? e.message : labels.comingSoon);
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    const msg = labels.deleteConfirm ?? "Remove this proposal? This cannot be undone.";
    if (!window.confirm(msg)) return;
    setBusy("delete");
    try {
      const res = await deleteProposalById(proposalId);
      if (!res.ok) throw new Error(res.error || "delete_failed");
      toast.success(labels.deleteDone ?? "Removed", shareMetrics.customerName);
      onClose();
      router.push("/proposals");
      router.refresh();
    } catch (e) {
      toast.error(labels.deleteFailed ?? "Could not delete", e instanceof Error ? e.message : "");
    } finally {
      setBusy(null);
    }
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
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} aria-label={labels.sheetClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-1.5">
          <Button type="button" variant="ghost" className="h-11 w-full justify-start gap-3 text-sm font-medium" onClick={jumpToPricing}>
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
            <Button type="button" variant="ghost" className="h-11 w-full justify-start gap-3 text-sm font-medium" disabled={busy === "send"} onClick={() => void handleSend()}>
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
              {busy === "send" ? "Opening…" : labels.send}
            </Button>
          )}
          <Button type="button" variant="ghost" className="h-11 w-full justify-start gap-3 text-sm font-medium" disabled={busy === "ppt"} onClick={() => void handlePpt()}>
            <FileDown className="h-4 w-4 shrink-0" aria-hidden />
            {busy === "ppt" ? "Downloading…" : labels.pdfQuote}
          </Button>
          <Button type="button" variant="ghost" className="h-11 w-full justify-start gap-3 text-sm font-medium" onClick={() => soon(labels.duplicate)}>
            <Copy className="h-4 w-4 shrink-0" aria-hidden />
            {labels.duplicate}
          </Button>
          <Button type="button" variant="ghost" className="h-11 w-full justify-start gap-3 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40" disabled={busy === "delete"} onClick={() => void handleDelete()}>
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
            {busy === "delete" ? "Removing…" : (labels.deleteProposal ?? labels.archive)}
          </Button>
        </div>
      </div>
    </div>
  );
}
