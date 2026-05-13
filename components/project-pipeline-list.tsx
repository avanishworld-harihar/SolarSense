"use client";

import type { GlassProjectSummary, ProjectCardPatch } from "@/components/glass-project-card";
import { CardActionDots } from "@/components/card-action-dots";
import { useLanguage } from "@/lib/language-context";
import { inferOpsStage } from "@/lib/project-pipeline-stage";
import type { PipelineProjectRow } from "@/lib/supabase";
import { ChevronRight, Send } from "lucide-react";
import Link from "next/link";

export function ProjectPipelineList({
  items,
  onPatch,
  onEditProject,
  onDeleteProject,
  variant
}: {
  items: { row: PipelineProjectRow; glass: GlassProjectSummary }[];
  onPatch?: (id: string, patch: ProjectCardPatch) => void | Promise<void>;
  onEditProject?: (p: GlassProjectSummary) => void;
  onDeleteProject?: (p: GlassProjectSummary) => void;
  variant: "hidden" | "archived";
}) {
  const { t } = useLanguage();

  if (items.length === 0) return null;

  const statusLabel: Record<GlassProjectSummary["status"], string> = {
    active: t("projects_statusActive"),
    pending: t("projects_statusPending"),
    done: t("projects_statusDone")
  };

  return (
    <div className="page-lite-item overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0c1017]">
      <div className="border-b border-slate-200 bg-slate-100 px-3 py-2 dark:border-white/10 dark:bg-[#141a22]">
        <h3 className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {variant === "archived" ? t("projects_opsListArchived") : t("projects_opsListHidden")}
        </h3>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
        {items.map(({ row, glass }) => {
          const stage = inferOpsStage(row);
          const pct = Math.min(100, Math.max(0, Math.round(glass.installProgress)));
          return (
            <li key={glass.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{glass.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>{statusLabel[glass.status]}</span>
                  <span>·</span>
                  <span>{t(`projects_opsStage_${stage}`)}</span>
                  <span>·</span>
                  <span className="tabular-nums">{glass.capacityKw}</span>
                  <span>·</span>
                  <span className="tabular-nums">{t("projects_percentComplete", { n: pct })}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {glass.leadId ? (
                  <Link
                    href={`/customers?lead=${encodeURIComponent(glass.leadId)}`}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-[10px] font-bold text-slate-700 dark:border-white/15 dark:text-slate-200"
                  >
                    <Send className="h-3 w-3" />
                    <span className="hidden sm:inline">{t("projects_resumeProposal")}</span>
                  </Link>
                ) : null}
                {onEditProject || onDeleteProject ? (
                  <CardActionDots
                    className="relative"
                    editAriaLabel={t("projects_editProjectAria")}
                    deleteAriaLabel={t("projects_deleteProjectAria")}
                    onEdit={onEditProject ? () => onEditProject(glass) : undefined}
                    onDelete={onDeleteProject ? () => onDeleteProject(glass) : undefined}
                  />
                ) : null}
                {variant === "hidden" && onPatch ? (
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-md border border-slate-300 px-2 text-[10px] font-bold text-slate-800 dark:border-white/20 dark:text-slate-100"
                    onClick={() => void onPatch(glass.id, { dashboard_visible: true })}
                  >
                    {t("projects_kanbanShowDash")}
                  </button>
                ) : null}
                {variant === "archived" && onPatch ? (
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-0.5 rounded-md bg-slate-900 px-2 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900"
                    onClick={() => void onPatch(glass.id, { archived_at: null })}
                  >
                    {t("projects_kanbanRestore")}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
