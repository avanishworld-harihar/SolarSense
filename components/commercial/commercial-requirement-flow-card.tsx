"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Circle, ExternalLink, Layers, Sparkles, TrendingUp, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceTabId = "commercial_config" | "panel_pricing" | "capacity" | "financing";

const WORKSPACE_TABS: { id: WorkspaceTabId; label: string; icon: React.ElementType }[] = [
  { id: "commercial_config", label: "Commercial Config", icon: Sparkles },
  { id: "panel_pricing", label: "Panel & Pricing", icon: Layers },
  { id: "capacity", label: "Capacity", icon: TrendingUp },
  { id: "financing", label: "Financing", icon: CreditCard },
];

export type CommercialRequirementFlowCardProps = {
  hasClient: boolean;
  hasSizing: boolean;
  hasCategory: boolean;
  canOpenWorkspace: boolean;
  workspaceBlockReason: string | null;
  workspaceBusy: boolean;
  onOpenWorkspace: () => void;
  draftProposalId?: string | null;
  onOpenWorkspaceTab?: (tab: WorkspaceTabId) => void;
  showTabStrip?: boolean;
  variant?: "step2" | "step3";
  className?: string;
};

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs text-slate-600">
      {done ? (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-2.5 w-2.5 stroke-[3]" />
        </span>
      ) : (
        <Circle className="h-4 w-4 text-slate-300" />
      )}
      <span className={done ? "font-medium text-slate-800" : ""}>{label}</span>
    </li>
  );
}

export function CommercialRequirementFlowCard({
  hasClient,
  hasSizing,
  hasCategory,
  canOpenWorkspace,
  workspaceBlockReason,
  workspaceBusy,
  onOpenWorkspace,
  draftProposalId,
  onOpenWorkspaceTab,
  showTabStrip = false,
  variant = "step2",
  className,
}: CommercialRequirementFlowCardProps) {
  const workspaceBase = draftProposalId ? `/workspace/${draftProposalId}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white/80 to-sky-50/60 p-4 shadow-sm backdrop-blur-sm",
        variant === "step3" && "ring-1 ring-sky-200/50",
        className
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
        {variant === "step2" ? "Next: configure in Open Workspace" : "Commercial configuration"}
      </p>
      <p className="mt-1 text-xs leading-snug text-slate-600">
        Narrative, panel pricing, DCR comparison, capacity scenarios, and financing live in Open Workspace —
        not on this page.
      </p>

      <ul className="mt-3 space-y-1.5">
        <ChecklistRow done={hasClient} label="Client or organisation name" />
        <ChecklistRow done={hasSizing} label="Monthly kWh or system size (kW)" />
        <ChecklistRow done={hasCategory} label="Business category (hotel / factory / …)" />
      </ul>

      <button
        type="button"
        disabled={!canOpenWorkspace || workspaceBusy}
        onClick={onOpenWorkspace}
        title={workspaceBlockReason ?? undefined}
        className={cn(
          "mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-all",
          canOpenWorkspace
            ? "bg-gradient-to-r from-indigo-600 to-sky-600 text-white hover:from-indigo-700 hover:to-sky-700"
            : "cursor-not-allowed bg-slate-200 text-slate-500"
        )}
      >
        <ExternalLink className="h-4 w-4" />
        {workspaceBusy
          ? "Saving draft…"
          : draftProposalId
            ? "Open Workspace — continue configuration"
            : "Open Workspace — configure commercial proposal"}
      </button>

      {!canOpenWorkspace && workspaceBlockReason ? (
        <p className="mt-2 text-center text-[11px] font-medium text-amber-800">{workspaceBlockReason}</p>
      ) : null}

      {draftProposalId && workspaceBase ? (
        <motion.div className="mt-3">
          <Link
            href={`${workspaceBase}?from=requirement`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
          >
            Resume workspace
          </Link>
        </motion.div>
      ) : null}

      {showTabStrip && draftProposalId && workspaceBase ? (
        <div className="mt-4 border-t border-indigo-100/80 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Workspace modules
          </p>
          <div className="flex flex-wrap gap-1.5">
            {WORKSPACE_TABS.map(({ id, label, icon: Icon }) =>
              onOpenWorkspaceTab ? (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpenWorkspaceTab(id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/80 bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm hover:border-sky-200 hover:text-sky-800"
                >
                  <Icon className="h-3 w-3 text-sky-600" />
                  {label}
                </button>
              ) : (
                <Link
                  key={id}
                  href={`${workspaceBase}?tab=${id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/80 bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm hover:border-sky-200 hover:text-sky-800"
                >
                  <Icon className="h-3 w-3 text-sky-600" />
                  {label}
                </Link>
              )
            )}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
