"use client";

import { CardActionDots } from "@/components/card-action-dots";
import type { GlassProjectSummary, ProjectCardPatch } from "@/components/glass-project-card";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { HardHat, Send } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

const STALE_MS = 3 * 86_400_000;

function needsStalePulse(status: GlassProjectSummary["status"], updatedAtIso?: string | null): boolean {
  if (status !== "pending" && status !== "active") return false;
  if (!updatedAtIso) return false;
  const t = Date.parse(updatedAtIso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t > STALE_MS;
}

export const ProjectKanbanCard = memo(function ProjectKanbanCard({
  project,
  onPatch,
  onEditProject,
  onDeleteProject
}: {
  project: GlassProjectSummary;
  onPatch?: (id: string, patch: ProjectCardPatch) => void | Promise<void>;
  onEditProject?: (p: GlassProjectSummary) => void;
  onDeleteProject?: (p: GlassProjectSummary) => void;
}) {
  const { t } = useLanguage();
  const pct = Math.min(100, Math.max(0, Math.round(project.installProgress)));
  const stale = needsStalePulse(project.status, project.updatedAt);

  const statusLabel: Record<GlassProjectSummary["status"], string> = {
    active: t("projects_statusActive"),
    pending: t("projects_statusPending"),
    done: t("projects_statusDone")
  };

  return (
    <article
      className={cn(
        "group relative rounded-lg border border-slate-200/95 bg-white p-3 shadow-sm transition hover:border-amber-300/80 hover:shadow-md dark:border-white/12 dark:bg-[#11161d]",
        "border-l-[3px] border-l-amber-500 dark:border-l-amber-400",
        stale && "ring-1 ring-amber-400/40"
      )}
    >
      {onEditProject || onDeleteProject ? (
        <CardActionDots
          className="absolute right-1.5 top-1.5 z-10"
          editAriaLabel={t("projects_editProjectAria")}
          deleteAriaLabel={t("projects_deleteProjectAria")}
          onEdit={onEditProject ? () => onEditProject(project) : undefined}
          onDelete={onDeleteProject ? () => onDeleteProject(project) : undefined}
        />
      ) : null}

      <div className="flex items-start gap-2 pr-8">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
          aria-hidden
        >
          <HardHat className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold leading-snug text-slate-900 dark:text-slate-100">{project.name}</h3>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {statusLabel[project.status]} · {project.capacityKw}
          </p>
        </div>
      </div>

      {project.nextAction?.trim() ? (
        <p className="mt-2 text-[11px] font-semibold leading-snug text-slate-700 dark:text-slate-300">
          <span className="text-slate-400">{t("projects_nextActionAboveProgress")}: </span>
          {project.nextAction.trim()}
        </p>
      ) : null}

      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <span>{t("projects_installationProgress")}</span>
          <span className="tabular-nums text-slate-800 dark:text-slate-200">{t("projects_percentComplete", { n: pct })}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={pct}>
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600",
              project.status === "done" && "from-emerald-500 to-teal-600",
              project.status === "active" && "from-sky-500 to-indigo-600"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2 dark:border-white/10">
        {project.leadId ? (
          <Link
            href={`/proposal?leadId=${encodeURIComponent(project.leadId)}`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Send className="h-3 w-3 shrink-0" />
            {t("projects_resumeProposal")}
          </Link>
        ) : null}
        {onPatch ? (
          <>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/[0.06]"
              onClick={() => {
                const vis = project.dashboardVisible !== false;
                void onPatch(project.id, { dashboard_visible: !vis });
              }}
            >
              {project.dashboardVisible === false ? t("projects_kanbanShowDash") : t("projects_kanbanHideDash")}
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
});

ProjectKanbanCard.displayName = "ProjectKanbanCard";
