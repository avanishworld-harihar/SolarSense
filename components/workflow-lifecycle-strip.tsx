"use client";

import { ChevronRight } from "lucide-react";

import { useLanguage } from "@/lib/language-context";
import { normalizeProposalStatus, type ProposalStatus } from "@/lib/proposal-status";
import { cn } from "@/lib/utils";

const STEP_KEYS = [
  "workflow_lifecycle_lead",
  "workflow_lifecycle_proposalDraft",
  "workflow_lifecycle_proposalSent",
  "workflow_lifecycle_approved",
  "workflow_lifecycle_installation",
  "workflow_lifecycle_service"
] as const;

export type WorkflowLifecycleSurface = "crm" | "proposals-hub" | "proposal-detail" | "projects";

function lifecycleActiveIndex(surface: WorkflowLifecycleSurface, proposalStatus?: string | null): number {
  if (surface === "crm") return 0;
  if (surface === "proposals-hub") return 1;
  if (surface === "projects") return 4;
  const st = normalizeProposalStatus(proposalStatus) as ProposalStatus;
  switch (st) {
    case "draft":
      return 1;
    case "sent":
    case "viewed":
      return 2;
    case "negotiation":
      return 3;
    case "approved":
      return 4;
    default:
      return 1;
  }
}

/**
 * Horizontal lifecycle cue: Lead → … → Service.
 * Read-only guide — does not replace pipeline controls in each module.
 */
export function WorkflowLifecycleStrip({
  surface,
  proposalStatus,
  className
}: {
  surface: WorkflowLifecycleSurface;
  proposalStatus?: string | null;
  className?: string;
}) {
  const { t } = useLanguage();
  const active = lifecycleActiveIndex(surface, proposalStatus);

  return (
    <nav
      className={cn(
        "-mx-0.5 flex min-w-0 items-center gap-0 overflow-x-auto pb-0.5 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      aria-label={t("workflow_lifecycle_navAria")}
    >
      {STEP_KEYS.map((key, i) => (
        <div key={key} className="flex min-w-0 shrink-0 items-center">
          {i > 0 ? (
            <ChevronRight className="mx-0.5 h-3 w-3 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden />
          ) : null}
          <span
            className={cn(
              "whitespace-nowrap rounded-md px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide sm:px-2 sm:text-[10px]",
              i < active && "text-slate-400 dark:text-slate-500",
              i === active &&
                "bg-teal-50 text-teal-900 ring-1 ring-teal-500/30 dark:bg-teal-950/55 dark:text-teal-100 dark:ring-teal-400/35",
              i > active && "text-slate-300 dark:text-slate-600"
            )}
            aria-current={i === active ? "step" : undefined}
          >
            {t(key)}
          </span>
        </div>
      ))}
    </nav>
  );
}
