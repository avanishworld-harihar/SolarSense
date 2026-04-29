"use client";

import { GlassProjectCard, type GlassProjectSummary, type ProjectCardPatch } from "@/components/glass-project-card";
import { FloatingLabelInput, FloatingLabelSelect } from "@/components/ui/floating-label-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-center";
import { useLanguage } from "@/lib/language-context";
import { formatPipelineDisplayName, type PipelineProjectRow } from "@/lib/supabase";
import { DASHBOARD_STATS_SWR_KEY } from "@/lib/dashboard-stats-client";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useCallback, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

const PIPELINE_SWR_KEY = "/api/pipeline";

type ProjectsView = "active" | "hidden" | "archived";

const TAB_DEFS: { id: ProjectsView; labelKey: string; fallback: string; description: string }[] = [
  {
    id: "active",
    labelKey: "projects_tabActive",
    fallback: "Active",
    description: "On the dashboard right now."
  },
  {
    id: "hidden",
    labelKey: "projects_tabHidden",
    fallback: "Hidden from dashboard",
    description: "Decluttered from the home dashboard, still in the pipeline."
  },
  {
    id: "archived",
    labelKey: "projects_tabArchived",
    fallback: "Archived",
    description: "End-of-life projects. Restore anytime."
  }
];

async function fetchPipeline(url: string): Promise<PipelineProjectRow[]> {
  try {
    const r = await fetch(url);
    const j = (await r.json()) as { ok?: boolean; data?: unknown };
    if (!j.ok || !Array.isArray(j.data)) return [];
    return j.data as PipelineProjectRow[];
  } catch {
    return [];
  }
}

function mapPipelineStatus(s: string): GlassProjectSummary["status"] {
  const x = s.toLowerCase();
  if (x.includes("done") || x.includes("complete") || x.includes("commission")) return "done";
  if (x.includes("active") || x.includes("install") || x.includes("progress")) return "active";
  return "pending";
}

function rowToGlass(p: PipelineProjectRow): GlassProjectSummary {
  return {
    id: p.id,
    name: formatPipelineDisplayName(p.official_name, p.lead_name),
    detail: p.detail?.trim() || "—",
    capacityKw: p.capacity_kw?.trim() || "—",
    status: mapPipelineStatus(p.status),
    installProgress: Math.min(100, Math.max(0, p.install_progress)),
    nextAction: p.next_action?.trim() || null,
    updatedAt: p.updated_at,
    dashboardVisible: p.dashboard_visible !== false,
    archivedAt: p.archived_at,
    officialName: p.official_name,
    leadId: p.lead_id,
    leadName: p.lead_name
  };
}

function resolveView(raw: string | null): ProjectsView {
  if (raw === "hidden" || raw === "archived") return raw;
  return "active";
}

type ProjectEditStatus = GlassProjectSummary["status"];

function ProjectsBoard() {
  const { t } = useLanguage();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = resolveView(searchParams.get("view"));
  const { mutate: mutateGlobal } = useSWRConfig();
  const [projectModal, setProjectModal] = useState<"none" | "edit">("none");
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<GlassProjectSummary | null>(null);
  const [projForm, setProjForm] = useState({
    official_name: "",
    detail: "",
    capacity_kw: "",
    next_action: "",
    install_progress: "0",
    status: "pending" as ProjectEditStatus
  });
  const [projError, setProjError] = useState("");

  const modalFloatingClass =
    "h-12 rounded-xl border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 focus:border-teal-500 focus:ring-teal-200/70";

  const { data, error, isLoading, mutate: mutatePipeline } = useSWR(PIPELINE_SWR_KEY, fetchPipeline, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60_000,
    keepPreviousData: true
  });

  /**
   * One GET → three views. Filtering client-side keeps the SWR cache small,
   * lets us count tab badges instantly, and avoids re-fetching when the
   * operator flips between Active and Hidden.
   */
  const partitions = useMemo(() => {
    const rows = data ?? [];
    return {
      active: rows.filter((r) => r.dashboard_visible !== false && !r.archived_at),
      hidden: rows.filter((r) => r.dashboard_visible === false && !r.archived_at),
      archived: rows.filter((r) => Boolean(r.archived_at))
    };
  }, [data]);

  const cards = useMemo(() => partitions[view].map(rowToGlass), [partitions, view]);

  function setView(next: ProjectsView) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "active") params.delete("view");
    else params.set("view", next);
    const qs = params.toString();
    router.replace(qs ? `/projects?${qs}` : "/projects", { scroll: false });
  }

  function closeProjectEditModal() {
    setProjectModal("none");
    setEditProjectId(null);
    setProjError("");
    setProjForm({
      official_name: "",
      detail: "",
      capacity_kw: "",
      next_action: "",
      install_progress: "0",
      status: "pending"
    });
  }

  const openEditProject = useCallback(
    (project: GlassProjectSummary) => {
      const row = (data ?? []).find((r) => r.id === project.id);
      if (!row) return;
      setProjError("");
      setEditProjectId(row.id);
      setProjectModal("edit");
      setProjForm({
        official_name: row.official_name?.trim() ?? "",
        detail: row.detail?.trim() ?? "",
        capacity_kw: row.capacity_kw?.trim() ?? "",
        next_action: row.next_action?.trim() ?? "",
        install_progress: String(row.install_progress ?? 0),
        status: mapPipelineStatus(row.status)
      });
    },
    [data]
  );

  async function confirmDeleteProject() {
    if (!deleteProjectTarget) return;
    const id = deleteProjectTarget.id;
    const prev = data ?? [];
    setDeleteProjectTarget(null);
    void mutatePipeline((p) => (p ?? []).filter((r) => r.id !== id), { revalidate: false });
    try {
      const r = await fetch(`/api/pipeline/${id}`, { method: "DELETE" });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!j.ok) throw new Error(j.error || "Delete failed");
      await mutatePipeline();
      await mutateGlobal(DASHBOARD_STATS_SWR_KEY, undefined, { revalidate: true });
      toast.success(t("projects_projectDeleted"), t("projects_projectDeletedSub"));
    } catch (e) {
      await mutatePipeline(prev, { revalidate: false });
      toast.error(t("projects_projectDeleteFailed"), e instanceof Error ? e.message : "Please try again.");
    }
  }

  function onSubmitProjectEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProjError("");
    if (!editProjectId) return;
    const progress = Number(projForm.install_progress);
    if (Number.isNaN(progress) || progress < 0 || progress > 100) {
      setProjError(t("customers_fillRequired"));
      return;
    }
    void (async () => {
      try {
        const r = await fetch(`/api/pipeline/${editProjectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            official_name: projForm.official_name.trim(),
            detail: projForm.detail.trim(),
            capacity_kw: projForm.capacity_kw.trim(),
            next_action: projForm.next_action.trim() || null,
            install_progress: progress,
            status: projForm.status
          })
        });
        const j = (await r.json()) as { ok?: boolean; error?: string };
        if (!j.ok) throw new Error(j.error || "Could not update project");
        await mutatePipeline();
        await mutateGlobal(DASHBOARD_STATS_SWR_KEY, undefined, { revalidate: true });
        closeProjectEditModal();
        toast.success(t("projects_projectUpdated"), t("projects_projectUpdatedSub"));
      } catch (e) {
        toast.error(t("projects_projectUpdateFailed"), e instanceof Error ? e.message : "Please try again.");
      }
    })();
  }

  const handlePatch = useCallback(
    async (id: string, patch: ProjectCardPatch) => {
      const before = data ?? [];
      const stamp = new Date().toISOString();
      /**
       * Optimistic update: flip the row in the SWR cache instantly so the card
       * jumps to the right tab without a round-trip wait. Roll back on error.
       */
      const optimistic: PipelineProjectRow[] = before.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          dashboard_visible:
            patch.dashboard_visible !== undefined ? patch.dashboard_visible : row.dashboard_visible,
          archived_at:
            patch.archived_at === true
              ? stamp
              : patch.archived_at !== undefined
                ? patch.archived_at
                : row.archived_at,
          status: patch.status ?? row.status,
          next_action:
            patch.next_action !== undefined ? patch.next_action : row.next_action,
          install_progress:
            patch.install_progress !== undefined ? patch.install_progress : row.install_progress,
          updated_at: stamp
        };
      });
      void mutatePipeline(optimistic, { revalidate: false });
      try {
        const r = await fetch(`/api/pipeline/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        const j = (await r.json()) as { ok?: boolean; error?: string };
        if (!j.ok) throw new Error(j.error || "Could not update project");
        await mutatePipeline();
        await mutateGlobal(DASHBOARD_STATS_SWR_KEY, undefined, { revalidate: true });
        if (patch.dashboard_visible === false) {
          toast.success("Hidden from dashboard", "Find it under Hidden tab anytime.");
        } else if (patch.dashboard_visible === true) {
          toast.success("Restored to dashboard", "Project is back on the home view.");
        }
        if (patch.archived_at === true) {
          toast.success("Archived", "Project moved to Archived. Restore anytime.");
        } else if (patch.archived_at === null) {
          toast.success("Restored", "Project is back in the active pipeline.");
        }
      } catch (e) {
        void mutatePipeline(before, { revalidate: false });
        toast.error("Update failed", e instanceof Error ? e.message : "Please try again.");
      }
    },
    [data, mutateGlobal, mutatePipeline, toast]
  );

  const counts: Record<ProjectsView, number> = {
    active: partitions.active.length,
    hidden: partitions.hidden.length,
    archived: partitions.archived.length
  };

  const activeTabDef = TAB_DEFS.find((tab) => tab.id === view) ?? TAB_DEFS[0];

  const editingPipelineRow = useMemo(() => {
    if (projectModal !== "edit" || !editProjectId) return null;
    return (data ?? []).find((r) => r.id === editProjectId) ?? null;
  }, [projectModal, editProjectId, data]);

  return (
    <>
      <div className="ss-page-shell">
        <Card className="page-lite-item ss-page-backdrop border-white/55 p-0">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="ss-section-headline text-lg sm:text-xl">{t("projects_pipeline")}</CardTitle>
            <CardDescription className="ss-section-subline text-sm">{t("projects_pipelineSub")}</CardDescription>
          </CardHeader>
        </Card>

        <div
          role="tablist"
          aria-label="Projects view"
          className="page-lite-item flex flex-wrap gap-1.5 rounded-2xl border border-white/55 bg-white/55 p-1 shadow-[0_8px_24px_rgba(11,34,64,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-slate-900/55 sm:gap-2 sm:p-1.5"
        >
          {TAB_DEFS.map((tab) => {
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setView(tab.id)}
                className={cn(
                  "inline-flex flex-1 min-w-fit items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold tracking-tight transition-all sm:text-sm",
                  isActive
                    ? "bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-[0_8px_22px_rgba(67,56,202,0.32)]"
                    : "text-slate-700 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/[0.05]"
                )}
              >
                <span>{tab.fallback}</span>
                <span
                  className={cn(
                    "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] tabular-nums",
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-slate-200/80 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                  )}
                >
                  {counts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        <p className="page-lite-item -mt-1 px-1 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:text-sm">
          {activeTabDef.description}
        </p>

        {error && (
          <Card className="page-lite-item border-amber-200/90 bg-amber-50/90">
            <CardContent className="p-4 text-sm font-semibold text-amber-950">{t("projects_pipelineLoadErr")}</CardContent>
          </Card>
        )}

        {!isLoading && !error && cards.length === 0 && (
          <Card className="page-lite-item ss-card-subtle border-brand-100 bg-brand-50/50">
            <CardContent className="p-4 text-sm font-semibold text-slate-700">
              {view === "active"
                ? t("projects_pipelineEmpty")
                : view === "hidden"
                  ? "No projects are hidden from the dashboard right now."
                  : "Archive is empty. Old projects will land here once you archive them."}
            </CardContent>
          </Card>
        )}

        <div className="page-lite-sequence grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
          {isLoading && !cards.length
            ? [1, 2, 3].map((i) => (
                <Card key={i} className="min-h-[8rem] border-brand-100 bg-brand-50/30 p-4">
                  <Skeleton className="h-5 w-1/2 rounded-md" />
                  <Skeleton className="mt-3 h-3 w-4/5 rounded-md" />
                  <Skeleton className="mt-2 h-3 w-2/3 rounded-md" />
                  <Skeleton className="mt-6 h-2 w-full rounded-full" />
                </Card>
              ))
            : cards.map((project) => (
                <GlassProjectCard
                  key={project.id}
                  project={project}
                  onPatch={handlePatch}
                  onEditProject={openEditProject}
                  onDeleteProject={(p) => setDeleteProjectTarget(p)}
                />
              ))}
        </div>
      </div>

      {projectModal === "edit" && editProjectId && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-[12px] sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/55 bg-[hsl(var(--card))/0.96] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_30px_70px_-26px_rgba(15,23,42,0.48)] sm:max-h-[90vh] sm:pb-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-brand-800 sm:text-lg">{t("projects_editProjectTitle")}</h3>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                onClick={closeProjectEditModal}
                aria-label={t("actions_close")}
              >
                ×
              </button>
            </div>
            <form className="space-y-2.5 sm:space-y-3" onSubmit={onSubmitProjectEdit}>
              <p className="text-[11px] font-semibold text-slate-600">
                <span className="text-slate-500">{t("projects_leadContactReadonly")}: </span>
                {editingPipelineRow?.lead_name?.trim() || "—"}
              </p>
              <FloatingLabelInput
                label={t("projects_labelOfficialName")}
                containerClassName="my-4"
                className={modalFloatingClass}
                value={projForm.official_name}
                onChange={(e) => setProjForm((p) => ({ ...p, official_name: e.target.value }))}
              />
              <FloatingLabelInput
                label={t("projects_labelDetail")}
                containerClassName="my-4"
                className={modalFloatingClass}
                value={projForm.detail}
                onChange={(e) => setProjForm((p) => ({ ...p, detail: e.target.value }))}
              />
              <FloatingLabelInput
                label={t("projects_capacityLabel")}
                containerClassName="my-4"
                className={modalFloatingClass}
                value={projForm.capacity_kw}
                onChange={(e) => setProjForm((p) => ({ ...p, capacity_kw: e.target.value }))}
              />
              <FloatingLabelInput
                label={t("projects_labelNextAction")}
                containerClassName="my-4"
                className={modalFloatingClass}
                value={projForm.next_action}
                onChange={(e) => setProjForm((p) => ({ ...p, next_action: e.target.value }))}
              />
              <FloatingLabelInput
                label={t("projects_labelProgress")}
                containerClassName="my-4"
                className={modalFloatingClass}
                type="number"
                min={0}
                max={100}
                value={projForm.install_progress}
                onChange={(e) => setProjForm((p) => ({ ...p, install_progress: e.target.value }))}
              />
              <FloatingLabelSelect
                suppressHydrationWarning
                label={t("projects_formBoardStatus")}
                containerClassName="my-4"
                className={modalFloatingClass}
                value={projForm.status}
                onChange={(e) =>
                  setProjForm((p) => ({ ...p, status: e.target.value as ProjectEditStatus }))
                }
              >
                <option value="pending">{t("projects_statusPending")}</option>
                <option value="active">{t("projects_statusActive")}</option>
                <option value="done">{t("projects_statusDone")}</option>
              </FloatingLabelSelect>
              {projError ? <p className="text-sm font-semibold text-red-600">{projError}</p> : null}
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-3 text-sm font-extrabold text-white shadow-[0_14px_30px_-16px_rgba(20,184,166,0.9)] transition-all hover:brightness-105"
              >
                {t("projects_saveProjectChanges")}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteProjectTarget ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            className="w-full max-w-sm rounded-2xl border border-white/50 bg-[hsl(var(--card))] p-5 shadow-xl"
          >
            <h3 id="delete-project-title" className="text-base font-extrabold text-brand-900">
              {t("projects_deleteConfirmTitle")}
            </h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
              {t("projects_deleteConfirmBody", { name: deleteProjectTarget.name })}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                onClick={() => setDeleteProjectTarget(null)}
              >
                {t("projects_deleteCancel")}
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-700"
                onClick={() => void confirmDeleteProject()}
              >
                {t("projects_deleteConfirmCta")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="ss-page-shell">
          <Card className="page-lite-item border-brand-100 bg-brand-50/30 p-6">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="mt-3 h-3 w-72 rounded-md" />
          </Card>
        </div>
      }
    >
      <ProjectsBoard />
    </Suspense>
  );
}
