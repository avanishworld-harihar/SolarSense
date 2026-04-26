"use client";

import { GlassProjectCard, type GlassProjectSummary } from "@/components/glass-project-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/language-context";
import { formatPipelineDisplayName, type PipelineProjectRow } from "@/lib/supabase";
import { useMemo } from "react";
import useSWR from "swr";

const PIPELINE_SWR_KEY = "/api/pipeline";

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
    updatedAt: p.updated_at
  };
}

export default function ProjectsPage() {
  const { t } = useLanguage();
  const { data, error, isLoading } = useSWR(PIPELINE_SWR_KEY, fetchPipeline, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60_000
  });

  const cards = useMemo(() => (data ?? []).map(rowToGlass), [data]);

  return (
    <>
      <div className="ss-page-shell">
        <Card className="page-lite-item ss-page-backdrop border-white/55 p-0">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="ss-section-headline text-lg sm:text-xl">{t("projects_pipeline")}</CardTitle>
            <CardDescription className="ss-section-subline text-sm">{t("projects_pipelineSub")}</CardDescription>
          </CardHeader>
        </Card>

        {error && (
          <Card className="page-lite-item border-amber-200/90 bg-amber-50/90">
            <CardContent className="p-4 text-sm font-semibold text-amber-950">{t("projects_pipelineLoadErr")}</CardContent>
          </Card>
        )}

        {!isLoading && !error && cards.length === 0 && (
          <Card className="page-lite-item ss-card-subtle border-brand-100 bg-brand-50/50">
            <CardContent className="p-4 text-sm font-semibold text-slate-700">{t("projects_pipelineEmpty")}</CardContent>
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
            : cards.map((project) => <GlassProjectCard key={project.id} project={project} />)}
        </div>
      </div>
    </>
  );
}
