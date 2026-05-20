"use client";

import { useToast } from "@/components/ui/toast-center";
import {
  deleteProposalById,
  downloadProposalPpt,
  markProposalSent,
  openWhatsAppWithProposal,
  type ProposalShareMetrics,
} from "@/lib/proposal-share-actions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Copy, ExternalLink, FileDown, ListTree, MessageCircle, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SHEET_Z = "z-[10060]";

const actionBtnClass = cn(
  buttonVariants({ variant: "ghost" }),
  "h-11 w-full touch-manipulation justify-start gap-3 px-3 text-sm font-medium text-slate-800 dark:text-slate-100"
);

function ActionRow({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cn(actionBtnClass, className)}>
      {children}
    </button>
  );
}

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
  onSent,
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
  const [mounted, setMounted] = useState(false);
  const publicHref = `/proposal/${proposalId}`;
  const [busy, setBusy] = useState<"send" | "ppt" | "delete" | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  function soon(feature: string) {
    toast.info(labels.comingSoon, feature);
    handleClose();
  }

  function jumpToPricing() {
    document.getElementById("bom")?.scrollIntoView({ behavior: "smooth", block: "start" });
    handleClose();
  }

  async function handleSend() {
    setBusy("send");
    try {
      openWhatsAppWithProposal(shareMetrics, proposalId);
      const ok = await markProposalSent(proposalId);
      if (ok) onSent?.();
      toast.success(labels.send, labels.sendDone ?? "WhatsApp opened.");
      handleClose();
    } finally {
      setBusy(null);
    }
  }

  async function handlePpt() {
    setBusy("ppt");
    try {
      await downloadProposalPpt(proposalId, shareMetrics.customerName);
      toast.success(labels.pdfQuote, "Download started.");
      handleClose();
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
      handleClose();
      router.push("/proposals");
      router.refresh();
    } catch (e) {
      toast.error(labels.deleteFailed ?? "Could not delete", e instanceof Error ? e.message : "");
    } finally {
      setBusy(null);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={cn("fixed inset-0 flex items-end justify-center md:items-center md:p-6", SHEET_Z)}
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-950/50 touch-manipulation"
        aria-label={labels.sheetClose}
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.moreActions}
        className="relative z-[1] max-h-[min(85dvh,560px)] w-full max-w-md touch-manipulation overflow-y-auto rounded-t-2xl border border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl dark:border-white/10 dark:bg-[#0f1419] md:max-h-[min(80vh,640px)] md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{labels.moreActions}</p>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            onClick={handleClose}
            aria-label={labels.sheetClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-1">
          <ActionRow onClick={jumpToPricing}>
            <ListTree className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
            {labels.jumpToPricing}
          </ActionRow>
          {primaryIsSend ? (
            <ActionRow
              onClick={() => {
                handleClose();
                window.open(publicHref, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
              {labels.openPublic}
            </ActionRow>
          ) : (
            <ActionRow disabled={busy === "send"} onClick={() => void handleSend()}>
              <MessageCircle className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
              {busy === "send" ? "Opening…" : labels.send}
            </ActionRow>
          )}
          <ActionRow disabled={busy === "ppt"} onClick={() => void handlePpt()}>
            <FileDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
            {busy === "ppt" ? "Downloading…" : labels.pdfQuote}
          </ActionRow>
          <ActionRow onClick={() => soon(labels.duplicate)}>
            <Copy className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
            {labels.duplicate}
          </ActionRow>
          <ActionRow
            disabled={busy === "delete"}
            className="text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
            onClick={() => void handleDelete()}
          >
            <Trash2 className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" aria-hidden />
            {busy === "delete" ? "Removing…" : (labels.deleteProposal ?? labels.archive)}
          </ActionRow>
        </div>
      </div>
    </div>,
    document.body
  );
}
