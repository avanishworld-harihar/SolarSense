"use client";

/**
 * Review proposal — toggle blocks and reorder before generate/share.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Eye, X } from "lucide-react";
import { ProposalModulesStrip } from "@/components/proposals/proposal-modules-strip";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import { getPresetDefaultLayout } from "@/lib/proposal-preset-engine";
import type { ProposalPresetId } from "@/lib/proposal-preset-engine";

type Props = {
  open: boolean;
  onClose: () => void;
  proposalId?: string;
  presetId: ProposalPresetId;
  layout: ProposalTemplateV1;
  onLayoutChange: (layout: ProposalTemplateV1) => void;
  onConfirm?: () => void;
};

export function ProposalReviewSheet({
  open,
  onClose,
  proposalId,
  presetId,
  layout,
  onLayoutChange,
  onConfirm,
}: Props) {
  const enabledCount = layout.blocks.filter((b) => b.enabled).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[201] max-h-[85dvh] overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0c1017]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/8">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-sky-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Review proposal</p>
                  <p className="text-[11px] text-slate-500">
                    {enabledCount} sections enabled · drag to reorder
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: "calc(85dvh - 8rem)" }}>
              {proposalId ? (
                <ProposalModulesStrip
                  proposalId={proposalId}
                  initialLayout={layout}
                  onSaved={onLayoutChange}
                  tone="embedded"
                />
              ) : (
                <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-white/5">
                  Save draft first to persist section order, or generate — layout uses preset defaults (
                  {getPresetDefaultLayout(presetId).blocks.filter((b) => b.enabled).length} sections).
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 p-4 dark:border-white/8">
              <button
                type="button"
                onClick={() => {
                  onConfirm?.();
                  onClose();
                }}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
              >
                Confirm & continue
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
