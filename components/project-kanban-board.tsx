"use client";

import type { GlassProjectSummary, ProjectCardPatch } from "@/components/glass-project-card";
import { ProjectKanbanCard } from "@/components/project-kanban-card";
import { useLanguage } from "@/lib/language-context";
import { inferOpsStage, OPS_STAGE_ORDER, type OpsStageId } from "@/lib/project-pipeline-stage";
import type { PipelineProjectRow } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const STAGE_ACCENT: Record<OpsStageId, string> = {
  survey: "border-t-amber-500",
  design: "border-t-violet-500",
  approval: "border-t-blue-500",
  installation: "border-t-orange-500",
  net_metering: "border-t-cyan-500",
  completed: "border-t-emerald-500",
  service: "border-t-slate-500"
};

export function ProjectKanbanBoard({
  items,
  onPatch,
  onEditProject,
  onDeleteProject
}: {
  items: { row: PipelineProjectRow; glass: GlassProjectSummary }[];
  onPatch?: (id: string, patch: ProjectCardPatch) => void | Promise<void>;
  onEditProject?: (p: GlassProjectSummary) => void;
  onDeleteProject?: (p: GlassProjectSummary) => void;
}) {
  const { t } = useLanguage();

  const columns = useMemo(() => {
    const map = new Map<OpsStageId, { row: PipelineProjectRow; glass: GlassProjectSummary }[]>();
    for (const id of OPS_STAGE_ORDER) map.set(id, []);
    for (const item of items) {
      const stage = inferOpsStage(item.row);
      map.get(stage)!.push(item);
    }
    return map;
  }, [items]);

  return (
    <div className="page-lite-item -mx-1 overflow-x-auto pb-2 pt-1">
      <div className="flex min-h-[min(70vh,520px)] snap-x snap-mandatory gap-3 px-1 md:min-h-[min(75vh,600px)]">
        {OPS_STAGE_ORDER.map((stageId) => {
          const list = columns.get(stageId) ?? [];
          return (
            <div
              key={stageId}
              className={cn(
                "flex w-[min(85vw,17.5rem)] shrink-0 snap-start flex-col rounded-xl border border-slate-200/90 bg-slate-50/80 dark:border-white/10 dark:bg-[#0a0d12]",
                "border-t-[3px] shadow-sm",
                STAGE_ACCENT[stageId]
              )}
            >
              <header className="sticky top-0 z-[1] rounded-t-[10px] border-b border-slate-200/80 bg-slate-100/95 px-3 py-2 dark:border-white/10 dark:bg-[#12171f]">
                <h3 className="text-[11px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">
                  {t(`projects_opsStage_${stageId}`)}
                </h3>
                <p className="text-[10px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
                  {list.length} {t("projects_kanbanJobs")}
                </p>
              </header>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                {list.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200/90 px-2 py-6 text-center text-[10px] font-semibold text-slate-400 dark:border-white/10 dark:text-slate-500">
                    {t("projects_kanbanEmptyColumn")}
                  </p>
                ) : (
                  list.map(({ glass }) => (
                    <ProjectKanbanCard
                      key={glass.id}
                      project={glass}
                      onPatch={onPatch}
                      onEditProject={onEditProject}
                      onDeleteProject={onDeleteProject}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 md:hidden">{t("projects_kanbanSwipeHint")}</p>
    </div>
  );
}
