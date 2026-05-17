"use client";

import { DashboardCommandCenter } from "@/components/dashboard-command-center";
import { DashboardOperationalInsights } from "@/components/dashboard-operational-insights";
import { DashboardQuickActions } from "@/components/dashboard-quick-actions";
import { DashboardSectionTitle } from "@/components/dashboard-section-title";
import { OfflineDataNotice } from "@/components/offline-data-notice";
import { GlassProjectCard, type GlassProjectSummary } from "@/components/glass-project-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingLabelSelect } from "@/components/ui/floating-label-input";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import useSWR from "swr";
import {
  DASHBOARD_STATS_SWR_KEY,
  fetchDashboardStats,
  getDashboardCacheAgeMs,
  readDashboardStatsCache,
  writeDashboardStatsCache,
  type DashboardStatsPayload
} from "@/lib/dashboard-stats-client";
import { useInstallerDiscoms } from "@/hooks/use-installer-discoms";
import { INDIAN_STATES_AND_UTS } from "@/lib/indian-states-uts";
import {
  INSTALLER_DISCOM_KEY,
  INSTALLER_REGION_EVENT,
  INSTALLER_STATE_KEY,
  mergeSavedDiscomOption,
  readInstallerRegion,
  resolveDiscomCode,
  writeInstallerRegion
} from "@/lib/installer-region-storage";
import { MapPin, UserPlus } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { buildMetricTrendLines, writeTrendBaseline, type MetricTrendLines } from "@/lib/dashboard-trends";
import { useLanguage } from "@/lib/language-context";
import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

const _demoStale = new Date(Date.now() - 5 * 86_400_000).toISOString();
const _demoFresh = new Date(Date.now() - 1 * 86_400_000).toISOString();
const SHOW_DEMO_PROJECTS = process.env.NEXT_PUBLIC_SHOW_DEMO_PROJECTS !== "false";
const dashboardStagger = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.04
    }
  }
} as const;

const dashboardItem = {
  visible: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: "easeOut"
    }
  }
} as const;

function DashboardStaggerRoot({ animate, children }: { animate: boolean; children: ReactNode }) {
  if (!animate) return <div className="space-y-5 sm:space-y-6 md:space-y-7">{children}</div>;
  return (
    <motion.div initial="hidden" animate="show" variants={dashboardStagger} className="space-y-5 sm:space-y-6 md:space-y-7">
      {children}
    </motion.div>
  );
}

function DashboardItem({
  animate,
  children,
  as = "div",
  className,
  "aria-live": ariaLive
}: {
  animate: boolean;
  children: ReactNode;
  as?: "div" | "p";
  className?: string;
  "aria-live"?: "polite" | "assertive" | "off";
}) {
  if (!animate) {
    if (as === "p") {
      return (
        <p className={className} aria-live={ariaLive}>
          {children}
        </p>
      );
    }
    return <div className={className}>{children}</div>;
  }
  if (as === "p") {
    return (
      <motion.p variants={dashboardItem} className={className} aria-live={ariaLive}>
        {children}
      </motion.p>
    );
  }
  return (
    <motion.div variants={dashboardItem} className={className}>
      {children}
    </motion.div>
  );
}

function DashboardPageContent() {
  const { t, locale } = useLanguage();
  const online = useOnlineStatus();
  const prefersReducedMotion = useReducedMotion();
  const [installerState, setInstallerState] = useState("");
  const [installerDiscom, setInstallerDiscom] = useState("");
  const [installerSaved, setInstallerSaved] = useState(false);
  const { options: discomOptions, loading: discomListLoading } = useInstallerDiscoms(installerState);
  const discomSelectOptions = useMemo(
    () => mergeSavedDiscomOption(installerDiscom, discomOptions),
    [installerDiscom, discomOptions]
  );
  const [metricTrends, setMetricTrends] = useState<MetricTrendLines | null>(null);
  /** Only true â€œfinger-firstâ€ pointers skip stagger â€” keeps entrance motion on mouse / hybrid laptops. */
  const [isPointerCoarse, setIsPointerCoarse] = useState(false);

  useEffect(() => {
    const { state, discom } = readInstallerRegion();
    if (state) {
      setInstallerState(state);
      setInstallerDiscom(discom);
      setInstallerSaved(true);
    }
  }, []);

  /** More / Customers se region save hone par dashboard turant sync ho. */
  useEffect(() => {
    const sync = () => {
      const { state, discom } = readInstallerRegion();
      if (state) {
        setInstallerState(state);
        setInstallerDiscom(discom);
        setInstallerSaved(true);
      }
    };
    window.addEventListener(INSTALLER_REGION_EVENT, sync);
    return () => window.removeEventListener(INSTALLER_REGION_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!installerState.trim()) {
      setInstallerDiscom("");
      return;
    }
    if (discomOptions.length === 0) return;
    setInstallerDiscom((prev) => resolveDiscomCode(prev.trim(), discomOptions));
  }, [installerState, discomOptions]);

  /** Purane installs: LS me state thi, DISCOM key nahi â€” seed sirf tab jab UI state LS se match ho. */
  useEffect(() => {
    if (!installerState.trim() || discomOptions.length === 0) return;
    let stateInLs = "";
    let discomInLs = "";
    try {
      stateInLs = localStorage.getItem(INSTALLER_STATE_KEY)?.trim() ?? "";
      discomInLs = localStorage.getItem(INSTALLER_DISCOM_KEY)?.trim() ?? "";
    } catch {
      /* ignore */
    }
    if (!stateInLs || discomInLs) return;
    if (installerState.trim() !== stateInLs) return;
    const next = resolveDiscomCode("", discomOptions);
    if (next) writeInstallerRegion(stateInLs, next);
  }, [installerState, discomOptions]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setIsPointerCoarse(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardStatsPayload>(
    DASHBOARD_STATS_SWR_KEY,
    fetchDashboardStats,
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      keepPreviousData: true,
      onSuccess: (payload) => writeDashboardStatsCache(payload)
    }
  );

  useLayoutEffect(() => {
    const boot = readDashboardStatsCache();
    if (boot) void mutate(boot, { revalidate: false });
  }, [mutate]);

  const showMetricSkeleton = isLoading && data === undefined && !error;
  const stats = data;
  const projectSummaries = useMemo((): GlassProjectSummary[] => {
    const live = stats?.recentProjects ?? [];
    if (live.length > 0) return live;
    if (!SHOW_DEMO_PROJECTS) return [];
    return [
      {
        id: "demo-1",
        name: "Sharma Residence (Ravi Sharma)",
        detail: `${t("dashboard_demo_p1_detail")} â€¢ Demo data`,
        capacityKw: "5.4 kW",
        status: "active",
        installProgress: 60,
        nextAction: `${t("dashboard_demo_p1_next")} â€¢ Demo`,
        updatedAt: _demoStale
      },
      {
        id: "demo-2",
        name: "Patel Commercial (Jignesh Patel)",
        detail: `${t("dashboard_demo_p2_detail")} â€¢ Demo data`,
        capacityKw: "12 kW",
        status: "pending",
        installProgress: 35,
        nextAction: `${t("dashboard_demo_p2_next")} â€¢ Demo`,
        updatedAt: _demoFresh
      },
      {
        id: "demo-3",
        name: "Green Valley School (Trust office)",
        detail: `${t("dashboard_demo_p3_detail")} â€¢ Demo data`,
        capacityKw: "25 kW",
        status: "done",
        installProgress: 100,
        nextAction: "Installation complete â€¢ Demo",
        updatedAt: _demoFresh
      }
    ];
  }, [stats?.recentProjects, t]);
  const showingDemoProjects = (stats?.recentProjects?.length ?? 0) === 0 && projectSummaries.length > 0;
  const shouldAnimateDashboard = !prefersReducedMotion && !isPointerCoarse;

  useEffect(() => {
    if (!stats) {
      setMetricTrends(null);
      return;
    }
    setMetricTrends(buildMetricTrendLines(stats, locale));
    writeTrendBaseline(stats);
  }, [stats, locale]);

  function saveInstallerState() {
    if (!installerState.trim() || !installerDiscom.trim()) return;
    try {
      writeInstallerRegion(installerState, installerDiscom);
      setInstallerSaved(true);
    } catch {
      setInstallerSaved(false);
    }
  }

  return (
    <div className="workspace-dashboard">
    <DashboardStaggerRoot animate={shouldAnimateDashboard}>
        <DashboardItem animate={shouldAnimateDashboard} className="dashboard-zone-command">
          <DashboardCommandCenter name="Avanish" stats={stats} loading={showMetricSkeleton} />
        </DashboardItem>

        <DashboardItem animate={shouldAnimateDashboard}>
          <OfflineDataNotice
            show={!online && data !== undefined}
            cacheAgeMs={getDashboardCacheAgeMs()}
            label={t("offline_dashboardStrip")}
          />
        </DashboardItem>

        {error && data === undefined && (
          <DashboardItem animate={shouldAnimateDashboard}>
            <Card className="border-amber-200/90 bg-amber-50/90 backdrop-blur-sm">
              <CardContent className="p-4 text-sm font-semibold leading-snug text-amber-950">
                {(error as Error).message ?? t("dashboard_errorLoad")} {t("dashboard_errorConnect")}
              </CardContent>
            </Card>
          </DashboardItem>
        )}

        {!installerSaved && (
          <DashboardItem animate={shouldAnimateDashboard}>
            <Card className="glass-surface border-white/55 dark:border dark:border-emerald-500/45 dark:bg-[#070b12] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
              <CardHeader className="space-y-1 p-4 pb-2 sm:p-6 sm:pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                    aria-hidden
                  >
                    <MapPin className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-[#94A3B8] sm:text-base">
                    {t("dashboard_installerSetup")}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs font-semibold leading-snug text-muted-foreground sm:text-sm">
                  {t("dashboard_installerSetupSub")}{" "}
                  <strong className="text-foreground">{INDIAN_STATES_AND_UTS.length}</strong> options (28 states + 8 UTs).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="flex flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:gap-3">
                  <FloatingLabelSelect
                    label={t("dashboard_selectState")}
                    suppressHydrationWarning
                    value={installerState}
                    onChange={(e) => setInstallerState(e.target.value)}
                    className="h-12"
                    containerClassName="md:flex-1"
                  >
                    <option value="">{t("dashboard_selectState")}</option>
                    {INDIAN_STATES_AND_UTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </FloatingLabelSelect>
                  <FloatingLabelSelect
                    label={t("dashboard_selectDiscom")}
                    suppressHydrationWarning
                    value={installerDiscom}
                    disabled={!installerState.trim()}
                    onChange={(e) => setInstallerDiscom(e.target.value)}
                    className="h-12 disabled:opacity-60"
                    containerClassName="md:flex-1"
                    aria-label={t("dashboard_selectDiscom")}
                  >
                    {!installerState.trim() ? (
                      <option value="">{t("dashboard_selectDiscom")}</option>
                    ) : discomListLoading && discomSelectOptions.length === 0 ? (
                      <option value="">{t("dashboard_loadingDiscoms")}</option>
                    ) : (
                      <>
                        <option value="">{t("dashboard_selectDiscom")}</option>
                        {discomSelectOptions.map((d) => (
                          <option key={d.id} value={d.code}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </>
                    )}
                  </FloatingLabelSelect>
                  <Button
                    type="button"
                    variant="emeraldCta"
                    size="lg"
                    className="h-12 w-full min-w-0 shrink-0 md:min-w-[7rem] md:flex-1"
                    disabled={!installerState.trim() || !installerDiscom.trim()}
                    onClick={saveInstallerState}
                  >
                    {t("actions_save")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </DashboardItem>
        )}

        {installerSaved && (
          <DashboardItem animate={shouldAnimateDashboard}>
            <Card className="border-solar-200/80 bg-solar-50/90 backdrop-blur-sm">
              <CardContent className="p-3 text-xs font-semibold leading-snug text-solar-800 sm:p-4 sm:text-sm lg:text-base">
                {installerDiscom.trim()
                  ? t("dashboard_activeRegion", { state: installerState, discom: installerDiscom })
                  : t("dashboard_activeState", { state: installerState })}
              </CardContent>
            </Card>
          </DashboardItem>
        )}

        {isValidating && data !== undefined && (
          <DashboardItem
            animate={shouldAnimateDashboard}
            as="p"
            className="text-center text-[10px] font-semibold text-indigo-500/90 dark:text-muted-foreground sm:text-xs"
            aria-live="polite"
          >
            {t("actions_refreshing")}
          </DashboardItem>
        )}

        <DashboardItem animate={shouldAnimateDashboard} className="dashboard-zone-insights">
          <div className="ws-zone-surface">
            <DashboardSectionTitle>{t("dashboard_operationalInsights")}</DashboardSectionTitle>
            <DashboardOperationalInsights stats={stats} trends={metricTrends} loading={showMetricSkeleton} />
          </div>
        </DashboardItem>

        <DashboardItem animate={shouldAnimateDashboard} className="dashboard-zone-secondary">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <DashboardSectionTitle tier="quiet">{t("dashboard_projectActivity")}</DashboardSectionTitle>
            <Link
              href="/projects?view=hidden"
              className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-300 sm:text-xs"
            >
              Manage visibility →
            </Link>
          </div>
          {showingDemoProjects && (
            <p className="mb-2 text-[11px] font-semibold text-indigo-600 dark:text-[#94A3B8] sm:text-xs">Showing demo projects for UI preview.</p>
          )}
          {projectSummaries.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
              {projectSummaries.map((project) => (
                <GlassProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <Card className="glass-surface border-white/55">
              <CardContent className="p-4 text-sm font-semibold text-slate-700">No active projects yet.</CardContent>
            </Card>
          )}
        </DashboardItem>

        <DashboardItem animate={shouldAnimateDashboard} className="dashboard-zone-tertiary">
          <div className="glass-panel-premium p-4 sm:p-5 md:p-6">
            <DashboardSectionTitle tier="quiet">{t("dashboard_quickActions")}</DashboardSectionTitle>
            <p className="mb-4 -mt-1 text-xs font-medium text-slate-500 dark:text-[#8B949E] sm:text-sm">
              {t("dashboard_quickActionsSub")}
            </p>
            <DashboardQuickActions />
          </div>
        </DashboardItem>
      </DashboardStaggerRoot>
    </div>
  );
}

export default DashboardPageContent;
