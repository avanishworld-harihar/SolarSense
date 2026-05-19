"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  applyCommercialFlagsToLayout,
  type CommercialProposalConfig,
} from "@/lib/commercial-proposal-config";
import type { ProposalTemplateV1 } from "@/lib/proposal-template-schema";
import { useToast } from "@/components/ui/toast-center";
import { cn } from "@/lib/utils";

type Props = {
  proposalId: string;
  title: string;
  subtitle: string;
  config: CommercialProposalConfig;
  proposalLayout?: ProposalTemplateV1;
  onSaved: (config: CommercialProposalConfig, layout?: ProposalTemplateV1) => void;
  children: React.ReactNode;
  className?: string;
};

export function CommercialWorkspaceShell({
  proposalId,
  title,
  subtitle,
  config,
  proposalLayout,
  onSaved,
  children,
  className,
}: Props) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const layout = proposalLayout
        ? applyCommercialFlagsToLayout(proposalLayout, config)
        : undefined;
      const res = await fetch(`/api/proposals/${proposalId}/commercial-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commercialConfig: config, proposalLayout: layout }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        commercialConfig?: CommercialProposalConfig;
        proposalLayout?: ProposalTemplateV1;
      };
      if (!res.ok || !data.ok) {
        toast.push({ tone: "error", title: "Save failed", description: data.error ?? "" });
        return;
      }
      onSaved(data.commercialConfig ?? config, data.proposalLayout ?? layout);
      toast.push({ tone: "success", title: "Saved", description: `${title} synced to proposal` });
    } catch {
      toast.push({ tone: "error", title: "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-b from-white/95 to-slate-50/80 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/10 dark:from-[#0c1017]/95 dark:to-[#080b10]/90",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 px-4 py-4 dark:border-white/10 sm:px-5">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{title}</p>
          <p className="mt-0.5 max-w-xl text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save to proposal
        </button>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}
