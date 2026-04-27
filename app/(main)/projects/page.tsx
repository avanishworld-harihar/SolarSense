"use client";

import { GlassProjectCard, type GlassProjectSummary, type ProjectCardPatch } from "@/components/glass-project-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-center";
import { useLanguage } from "@/lib/language-context";
import { formatPipelineDisplayName, type PipelineProjectRow } from "@/lib/supabase";
import { DASHBOARD_STATS_SWR_KEY } from "@/lib/dashboard-stats-client";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
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
    archivedAt: p.archived_at
  };
}

function resolveView(raw: string | null): ProjectsView {
  if (raw === "hidden" || raw === "archived") return raw;
  return "active";
}

function ProjectsBoard() {
  const { t } = useLanguage();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = resolveView(searchParams.get("view"));
  const { mutate: mutateGlobal } = useSWRConfig();

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
                <GlassProjectCard key={project.id} project={project} onPatch={handlePatch} />
              ))}
        </div>
      </div>
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
