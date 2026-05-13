"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-center";
import { useLanguage } from "@/lib/language-context";
import type { ProposalBlockId } from "@/lib/proposal-block-registry";
import { PROPOSAL_BLOCK_REGISTRY } from "@/lib/proposal-block-registry";
import { cn } from "@/lib/utils";
import type { ProposalTemplateBlock, ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import { normalizeProposalTemplateV1 } from "@/lib/proposal-template-schema";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

export type ProposalModulesStripProps = {
  proposalId: string;
  initialLayout: ProposalTemplateV1;
  className?: string;
  onSaved?: (layout: ProposalTemplateV1) => void;
};

export function ProposalModulesStrip({ proposalId, initialLayout, className, onSaved }: ProposalModulesStripProps) {
  const { t } = useLanguage();
  const toast = useToast();
  const [blocks, setBlocks] = useState<ProposalTemplateBlock[]>(() => initialLayout.blocks);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBlocks(initialLayout.blocks.map((b) => ({ ...b })));
  }, [initialLayout]);

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= blocks.length) return;
    setBlocks((prev) => {
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  function toggle(id: ProposalBlockId) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)));
  }

  async function save() {
    setSaving(true);
    try {
      const proposalLayout = normalizeProposalTemplateV1({ version: 1, blocks });
      const res = await fetch(`/api/proposals/${proposalId}/layout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalLayout })
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; proposalLayout?: ProposalTemplateV1 };
      if (!res.ok || !data.ok) {
        toast.push({ tone: "error", title: t("proposals_modules_saveFailed"), description: data.error ?? "" });
        return;
      }
      const saved = data.proposalLayout ?? proposalLayout;
      setBlocks(saved.blocks.map((b) => ({ ...b })));
      onSaved?.(saved);
      toast.push({ tone: "success", title: t("proposals_modules_saved") });
    } catch {
      toast.push({ tone: "error", title: t("proposals_modules_saveFailed") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-3xl border border-white/60 bg-gradient-to-b from-white/98 to-slate-50/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-white/10 dark:from-[#0c1017] dark:to-[#080b10]",
        className
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">{t("proposals_modules_title")}</h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">{t("proposals_modules_sub")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          className="mt-3 shrink-0 font-bold sm:mt-0"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? t("proposals_saving") : t("proposals_modules_save")}
        </Button>
      </div>

      <ul className="mt-4 divide-y divide-slate-200/80 rounded-2xl border border-slate-200/80 bg-white/60 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.03]">
        {blocks.map((b, idx) => (
          <li key={b.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:flex-nowrap">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={b.enabled}
                onChange={() => toggle(b.id)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-white/20"
              />
              <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {t(PROPOSAL_BLOCK_REGISTRY[b.id].labelKey)}
              </span>
            </label>
            <div className="ml-auto flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={idx === 0}
                aria-label={t("proposals_modules_moveUp")}
                onClick={() => move(idx, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={idx === blocks.length - 1}
                aria-label={t("proposals_modules_moveDown")}
                onClick={() => move(idx, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
