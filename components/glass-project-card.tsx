"use client";

import { FolderKanban, PencilLine, X } from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectCardTouchMode } from "@/hooks/use-project-card-touch-mode";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

const STALE_MS = 3 * 86_400_000;

const glassBase =
  "border-[0.5px] border-white/60 bg-white/40 backdrop-blur-xl backdrop-saturate-150 " +
  "!shadow-[0_12px_40px_rgba(11,34,64,0.11),inset_0_1px_0_rgba(255,255,255,0.72)] " +
  "transition-[box-shadow,transform] duration-200 " +
  "dark:ss-dashboard-glass dark:!shadow-[0_18px_52px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.05)]";

export type GlassProjectSummary = {
  id: string;
  /** Hero: official bill name (lead name) — use `formatPipelineDisplayName` when building from CRM */
  name: string;
  detail: string;
  capacityKw: string;
  status: "active" | "pending" | "done";
  /** Installation / pipeline progress 0–100 */
  installProgress: number;
  /** Shown above progress bar, e.g. "Site survey" */
  nextAction?: string | null;
  /** ISO timestamp for stale Pending/Active pulse (>3 days in same state) */
  updatedAt?: string | null;
};

function statusNeedsStalePulse(status: GlassProjectSummary["status"], updatedAtIso?: string | null): boolean {
  if (status !== "pending" && status !== "active") return false;
  if (!updatedAtIso) return false;
  const t = Date.parse(updatedAtIso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t > STALE_MS;
}

function GlassProjectCardInner({ project, className }: { project: GlassProjectSummary; className?: string }) {
  const { t } = useLanguage();
  const stalePulse = statusNeedsStalePulse(project.status, project.updatedAt);
  const touchMode = useProjectCardTouchMode();
  const [touchExpanded, setTouchExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const statusGlowClass =
    project.status === "active"
      ? "card-status-active-glow"
      : project.status === "pending"
        ? "card-status-pending-glow"
        : "card-status-done-glow";
  function onCardActivate() {
    if (!touchMode) {
      setSheetOpen(true);
      return;
    }
    setTouchExpanded((v) => !v);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  }

  useEffect(() => {
    if (!touchMode || typeof document === "undefined") return;
    /* Lock scroll on `html`, not `body` — `overflow: hidden` on body breaks `position: fixed` (bottom nav) on iPad WebKit. */
    const root = document.documentElement;
    root.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      root.style.overflow = "";
    };
  }, [touchMode, sheetOpen]);

  const statusLabel: Record<GlassProjectSummary["status"], string> = {
    active: t("projects_statusActive"),
    pending: t("projects_statusPending"),
    done: t("projects_statusDone")
  };

  const pct = Math.min(100, Math.max(0, Math.round(project.installProgress)));

  const cardNode = (
      <Card
      title={stalePulse ? t("projects_stalePulseHint") : undefined}
      role="button"
      tabIndex={0}
      onClick={onCardActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardActivate();
        }
      }}
        className={cn(
          glassBase,
          "project-card-hover-lift project-card-touch-feedback relative isolate overflow-visible rounded-2xl",
          !touchMode && "cursor-pointer",
          touchExpanded && "project-card-touch-open",
          statusGlowClass,
          className
        )}
      >
      <CardHeader className="relative z-[2] space-y-2 p-3 pb-2 sm:p-4 sm:pb-2">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-[0.5px] border-white/55 bg-white/55 text-brand-700 shadow-[0_4px_14px_rgba(11,34,64,0.08)] ring-1 ring-white/50 backdrop-blur-sm dark:border-white/12 dark:bg-white/[0.08] dark:text-brand-200 dark:shadow-[0_4px_18px_rgba(0,0,0,0.35)] dark:ring-white/10 sm:h-10 sm:w-10"
            aria-hidden
          >
            <FolderKanban className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm font-bold leading-snug tracking-tight text-brand-800 dark:text-white sm:text-base">
                {project.name}
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 border-[0.5px] text-[9px] font-bold uppercase tracking-wide shadow-none sm:text-[10px]",
                  project.status === "done" &&
                    "border-emerald-300/80 bg-green-100 text-green-800 hover:bg-green-100 dark:border-emerald-700/50 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950/50",
                  project.status === "active" &&
                    "border-sky-200/80 bg-sky-100 text-sky-900 hover:bg-sky-100 dark:border-sky-700/50 dark:bg-sky-950/50 dark:text-sky-200 dark:hover:bg-sky-950/50",
                  project.status === "pending" &&
                    "border-amber-200/80 bg-amber-50 text-amber-950 hover:bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/45 dark:text-amber-100 dark:hover:bg-amber-950/45"
                )}
              >
                {statusLabel[project.status]}
              </Badge>
            </div>
            <CardDescription className="mt-1 text-[11px] font-medium leading-snug text-slate-600 dark:text-[#8B949E] sm:text-xs">
              {project.detail}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-[2] space-y-4 border-t border-white/40 bg-white/25 px-3 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-[#161B22]/55 sm:px-4 sm:py-3.5">
        {project.nextAction?.trim() ? (
          <p className="text-[11px] font-bold leading-snug text-indigo-600 dark:text-indigo-200 sm:text-xs">
            <span className="text-slate-500 dark:text-[#8B949E]">{t("projects_nextActionAboveProgress")}: </span>
            <span className="text-indigo-700 dark:text-indigo-200">{project.nextAction.trim()}</span>
          </p>
        ) : null}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-[#8B949E] sm:text-xs">
              {t("projects_installationProgress")}
            </span>
            <span className="text-[10px] font-extrabold tabular-nums text-brand-800 dark:text-white sm:text-xs">
              {t("projects_percentComplete", { n: pct })}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full border-[0.5px] border-white/40 bg-slate-200/80 shadow-inner dark:border-white/10 dark:bg-slate-800/90"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${project.name} installation progress`}
          >
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out",
                project.status === "done"
                  ? "from-solar-500 to-emerald-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-300 dark:shadow-[0_0_18px_rgba(45,212,191,0.5)]"
                  : project.status === "active"
                    ? "from-sky-500 to-indigo-500 dark:from-sky-400 dark:to-indigo-400 dark:shadow-[0_0_14px_rgba(56,189,248,0.35)]"
                    : "from-amber-400 to-orange-500 dark:shadow-[0_0_12px_rgba(251,191,36,0.25)]"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {touchMode ? (
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B949E]">
            {touchExpanded ? "Tap card to close actions" : "Tap card for quick actions"}
          </p>
        ) : null}
        {touchMode && touchExpanded ? (
          <div className="grid grid-cols-1 gap-2 border-t border-white/35 pt-2 dark:border-white/10">
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-between rounded-xl border border-brand-200/70 bg-brand-50/80 px-3 text-xs font-extrabold text-brand-800 transition active:scale-[0.99]"
              onClick={(e) => {
                e.stopPropagation();
                setSheetOpen(true);
              }}
            >
              Open project details
              <span className="text-sm leading-none">+</span>
            </button>
            <Link
              href="/projects"
              className="inline-flex min-h-10 items-center justify-between rounded-xl border border-indigo-200/70 bg-indigo-50/80 px-3 text-xs font-extrabold text-indigo-800 transition active:scale-[0.99]"
              onClick={(e) => e.stopPropagation()}
            >
              Update status / next action
              <PencilLine className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t border-white/35 pt-2.5 dark:border-white/10">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-[#8B949E] sm:text-xs">
            {t("projects_capacityLabel")}
          </span>
          <span className="text-sm font-extrabold tabular-nums text-solar-600 sm:text-base dark:bg-gradient-to-r dark:from-emerald-300 dark:via-teal-300 dark:to-cyan-200 dark:bg-clip-text dark:text-transparent">
            {project.capacityKw}
          </span>
        </div>
      </CardContent>
      </Card>
  );

  return (
    <>
      {cardNode}
      {sheetOpen ? (
        <div
          className={cn(
            "fixed inset-0 z-[2147483646] transition-opacity duration-200",
            sheetOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setSheetOpen(false)}
          aria-hidden={!sheetOpen}
        >
          <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" />
          <div
            className={cn(
              touchMode
                ? "absolute inset-x-0 bottom-0 rounded-t-3xl border border-white/55 bg-white/90 p-4 shadow-[0_-18px_48px_rgba(2,18,37,0.26)] backdrop-blur-xl transition-transform duration-250 dark:border-white/10 dark:bg-slate-950/92"
                : "absolute left-1/2 top-1/2 w-[min(92vw,34rem)] -translate-x-1/2 rounded-3xl border border-white/55 bg-white/92 p-4 shadow-[0_18px_58px_rgba(2,18,37,0.28)] backdrop-blur-xl transition-transform duration-250 dark:border-white/10 dark:bg-slate-950/95",
              sheetOpen ? "translate-y-0" : "translate-y-full"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-300/80 dark:bg-slate-700/90" />
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Project detail</p>
                <p className="mt-1 text-base font-extrabold text-brand-900 dark:text-brand-100">{project.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 dark:border-white/15 dark:bg-slate-900 dark:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/60 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1 text-sm font-extrabold text-slate-800 dark:text-slate-100">{statusLabel[project.status]}</p>
              </div>
              <div className="rounded-xl border border-white/60 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t("projects_capacityLabel")}</p>
                <p className="mt-1 text-sm font-extrabold text-slate-800 dark:text-slate-100">{project.capacityKw}</p>
              </div>
            </div>
            <div className="mt-2 rounded-xl border border-white/60 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Progress</p>
              <p className="mt-1 text-sm font-extrabold text-slate-800 dark:text-slate-100">{t("projects_percentComplete", { n: pct })}</p>
              {project.nextAction?.trim() ? (
                <p className="mt-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">{project.nextAction.trim()}</p>
              ) : null}
            </div>

            <Link
              href="/projects"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-indigo-300 bg-indigo-50 px-3 text-sm font-extrabold text-indigo-800 dark:border-indigo-500/50 dark:bg-indigo-950/50 dark:text-indigo-200"
              onClick={() => setSheetOpen(false)}
            >
              Open full projects board
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}

export const GlassProjectCard = memo(GlassProjectCardInner);
GlassProjectCard.displayName = "GlassProjectCard";
