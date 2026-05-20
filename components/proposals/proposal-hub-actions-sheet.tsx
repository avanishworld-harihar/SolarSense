"use client";

import { useToast } from "@/components/ui/toast-center";
import type { ProposalListCardProps } from "@/components/proposals/proposal-list-card";
import {
  deleteProposalById,
  downloadProposalPpt,
  markProposalSent,
  openWhatsAppWithProposal,
  type ProposalShareMetrics,
} from "@/lib/proposal-share-actions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Copy, ExternalLink, FileDown, MessageCircle, PencilLine, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Above `#ss-bottom-nav-portal` (9999) so sheet receives taps on iPad / mobile. */
const SHEET_Z = "z-[10060]";

type Labels = ProposalListCardProps["labels"] & {
  deleteProposal?: string;
  deleteConfirm?: string;
  deleteFailed?: string;
  deleteDone?: string;
  sendDone?: string;
  pptFailed?: string;
};

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

export function ProposalHubActionsSheet({
  open,
  onClose,
  proposalId,
  labels,
  annualSavingInr,
  shareMetrics,
  onDeleted,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  proposalId: string;
  labels: Labels;
  annualSavingInr: number | null;
  shareMetrics: ProposalShareMetrics;
  onDeleted?: () => void;
  onSent?: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const manageHref = `/proposals/${proposalId}`;
  const publicHref = `/proposal/${proposalId}`;
  const savingMo =
    annualSavingInr != null && Number.isFinite(annualSavingInr) ? Math.round(annualSavingInr / 12) : null;
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

  async function handleSend() {
    setBusy("send");
    try {
      openWhatsAppWithProposal(shareMetrics, proposalId);
      const ok = await markProposalSent(proposalId);
      if (ok) onSent?.();
      toast.success(labels.send, labels.sendDone ?? "WhatsApp opened — link included.");
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
    const msg = labels.deleteConfirm ?? "Remove this proposal from your list? This cannot be undone.";
    if (!window.confirm(msg)) return;
    setBusy("delete");
    try {
      const res = await deleteProposalById(proposalId);
      if (!res.ok) throw new Error(res.error || "delete_failed");
      toast.success(labels.deleteDone ?? "Removed", shareMetrics.customerName);
      onDeleted?.();
      handleClose();
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
          <ActionRow
            onClick={() => {
              handleClose();
              router.push(manageHref);
            }}
          >
            <PencilLine className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
            {labels.editPricing}
          </ActionRow>
          <ActionRow
            onClick={() => {
              handleClose();
              window.open(publicHref, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
            {labels.previewPublic}
          </ActionRow>
          <ActionRow disabled={busy === "ppt"} onClick={() => void handlePpt()}>
            <FileDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
            {busy === "ppt" ? "Downloading…" : labels.pdfQuote}
          </ActionRow>
          <ActionRow disabled={busy === "send"} onClick={() => void handleSend()}>
            <MessageCircle className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
            {busy === "send" ? "Opening…" : labels.send}
          </ActionRow>
          <ActionRow onClick={() => soon(labels.duplicateProposal)}>
            <Copy className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
            {labels.duplicateProposal}
          </ActionRow>
          <ActionRow
            disabled={busy === "delete"}
            className="text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
            onClick={() => void handleDelete()}
          >
            <Trash2 className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" aria-hidden />
            {busy === "delete" ? "Removing…" : (labels.deleteProposal ?? labels.archiveProposal)}
          </ActionRow>
        </div>
        {savingMo != null ? (
          <p className="mt-4 border-t border-slate-100 pt-3 text-center text-xs font-medium text-slate-600 dark:border-white/10 dark:text-slate-400">
            <span className="text-slate-500">{labels.estSavingMo}: </span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              ₹{savingMo.toLocaleString("en-IN")}
            </span>
          </p>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
