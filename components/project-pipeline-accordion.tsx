"use client";

import type { GlassProjectSummary, ProjectCardPatch } from "@/components/glass-project-card";
import { ProjectKanbanCard } from "@/components/project-kanban-card";
import { useLanguage } from "@/lib/language-context";
import { inferOpsStage, OPS_STAGE_ORDER, type OpsStageId } from "@/lib/project-pipeline-stage";
import type { PipelineProjectRow } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

const STAGE_RING: Record<OpsStageId, string> = {
  survey: "border-l-amber-500",
  design: "border-l-violet-500",
  approval: "border-l-blue-500",
  installation: "border-l-orange-500",
  net_metering: "border-l-cyan-500",
  completed: "border-l-emerald-500",
  service: "border-l-slate-500"
};

/** Vertical stage groups for small screens — replaces horizontal Kanban. */
export function ProjectPipelineAccordion({
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
  const [openId, setOpenId] = useState<OpsStageId | null>("survey");

  const columns = useMemo(() => {
    const map = new Map<OpsStageId, { row: PipelineProjectRow; glass: GlassProjectSummary }[]>();
    for (const id of OPS_STAGE_ORDER) map.set(id, []);
    for (const item of items) {
      map.get(inferOpsStage(item.row))!.push(item);
    }
    return map;
  }, [items]);

  return (
    <div className="page-lite-item space-y-3 pb-2">
      <p className="px-1 text-xs font-medium text-slate-600 dark:text-slate-400">{t("projects_opsMobileIntro")}</p>
      {OPS_STAGE_ORDER.map((stageId) => {
        const list = columns.get(stageId) ?? [];
        const isOpen = openId === stageId;
        return (
          <div
            key={stageId}
            className={cn(
              "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-white/10 dark:bg-[#0c1017]",
              "border-l-[4px]",
              STAGE_RING[stageId]
            )}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : stageId)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left active:bg-slate-50 dark:active:bg-white/[0.04]"
            >
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-50">{t(`projects_opsStage_${stageId}`)}</h3>
                <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-500">
                  {list.length} {t("projects_kanbanJobs")}
                </p>
              </div>
              <ChevronDown
                className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")}
                aria-hidden
              />
            </button>
            {isOpen ? (
              <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2 dark:border-white/10">
                {list.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-xs font-semibold text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
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
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
