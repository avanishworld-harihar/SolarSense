"use client";

import { DashboardGreeting } from "@/components/dashboard-greeting";
import { DashboardSectionTitle } from "@/components/dashboard-section-title";
import { OfflineDataNotice } from "@/components/offline-data-notice";
import { GlassProjectCard, type GlassProjectSummary } from "@/components/glass-project-card";
import { MetricCard } from "@/components/metric-card";
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
import {
  ClipboardList,
  FileText,
  FolderPlus,
  IndianRupee,
  MapPin,
  Send,
  Sun,
  Upload,
  UserPlus,
  Wallet
} from "lucide-react";
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
  /** Only true “finger-first” pointers skip stagger — keeps entrance motion on mouse / hybrid laptops. */
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

  /** Purane installs: LS me state thi, DISCOM key nahi — seed sirf tab jab UI state LS se match ho. */
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
        detail: `${t("dashboard_demo_p1_detail")} • Demo data`,
        capacityKw: "5.4 kW",
        status: "active",
        installProgress: 60,
        nextAction: `${t("dashboard_demo_p1_next")} • Demo`,
        updatedAt: _demoStale
      },
      {
        id: "demo-2",
        name: "Patel Commercial (Jignesh Patel)",
        detail: `${t("dashboard_demo_p2_detail")} • Demo data`,
        capacityKw: "12 kW",
        status: "pending",
        installProgress: 35,
        nextAction: `${t("dashboard_demo_p2_next")} • Demo`,
        updatedAt: _demoFresh
      },
      {
        id: "demo-3",
        name: "Green Valley School (Trust office)",
        detail: `${t("dashboard_demo_p3_detail")} • Demo data`,
        capacityKw: "25 kW",
        status: "done",
        installProgress: 100,
        nextAction: "Installation complete • Demo",
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
    <DashboardStaggerRoot animate={shouldAnimateDashboard}>
        <DashboardItem animate={shouldAnimateDashboard}>
          <DashboardGreeting name="Avanish" />
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
              <CardContent className="p-3 text-xs font-semibold leading-snug text-solar-800 sm:p-4 sm:text-sm">
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

        <DashboardItem animate={shouldAnimateDashboard}>
          <DashboardSectionTitle>{t("dashboard_overview")}</DashboardSectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
          <MetricCard
            icon={UserPlus}
            iconTone="blue"
            label={t("metrics_totalLeads")}
            value={stats ? String(stats.totalLeads) : "0"}
            countUpValue={stats?.totalLeads ?? 0}
            countUpFormat={(n) => Math.round(n).toLocaleString("en-IN")}
            loading={showMetricSkeleton}
            trend={metricTrends?.totalLeads}
          />
          <MetricCard
            icon={Send}
            iconTone="green"
            label={t("metrics_proposalsSent")}
            value={stats ? String(stats.proposalsSent) : "0"}
            countUpValue={stats?.proposalsSent ?? 0}
            countUpFormat={(n) => Math.round(n).toLocaleString("en-IN")}
            loading={showMetricSkeleton}
            trend={metricTrends?.proposalsSent}
          />
          <MetricCard
            icon={ClipboardList}
            iconTone="amber"
            label={t("metrics_orders")}
            value={stats ? String(stats.orders) : "0"}
            countUpValue={stats?.orders ?? 0}
            countUpFormat={(n) => Math.round(n).toLocaleString("en-IN")}
            loading={showMetricSkeleton}
            trend={metricTrends?.orders}
          />
          <MetricCard
            icon={Sun}
            iconTone="solar"
            label={t("metrics_installedKw")}
            value={stats ? stats.installedKw.toLocaleString("en-IN") : "0"}
            countUpValue={stats?.installedKw ?? 0}
            countUpFormat={(n) => Math.round(n).toLocaleString("en-IN")}
            loading={showMetricSkeleton}
            trend={metricTrends?.installedKw}
          />
          <MetricCard
            icon={IndianRupee}
            iconTone="violet"
            label={t("metrics_revenue")}
            value={stats ? `₹${Math.round(stats.revenue).toLocaleString("en-IN")}` : "₹0"}
            countUpValue={stats?.revenue ?? 0}
            countUpFormat={(n) => `₹${Math.round(n).toLocaleString("en-IN")}`}
            loading={showMetricSkeleton}
            trend={metricTrends?.revenue}
          />
          <MetricCard
            icon={Wallet}
            iconTone="rose"
            label={t("metrics_pending")}
            value={stats ? `₹${Math.round(stats.pendingPayments).toLocaleString("en-IN")}` : "₹0"}
            countUpValue={stats?.pendingPayments ?? 0}
            countUpFormat={(n) => `₹${Math.round(n).toLocaleString("en-IN")}`}
            loading={showMetricSkeleton}
            trend={metricTrends?.pendingPayments}
          />
          </div>
        </DashboardItem>

        <DashboardItem animate={shouldAnimateDashboard}>
          <DashboardSectionTitle>{t("dashboard_projectSummaries")}</DashboardSectionTitle>
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

        <DashboardItem animate={shouldAnimateDashboard}>
          <Card className="glass-surface border-white/55">
            <CardHeader className="space-y-1.5 p-4 pb-2 sm:p-6 sm:pb-3">
                <div className="flex items-start gap-2">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/35 dark:bg-[#94A3B8] dark:shadow-none"
                  aria-hidden
                />
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-[#94A3B8] sm:text-base">
                    {t("dashboard_quickActions")}
                  </CardTitle>
                  <CardDescription className="text-xs font-medium leading-snug text-slate-600 dark:text-muted-foreground sm:text-sm">
                    {t("dashboard_quickActionsSub")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid min-w-0 grid-cols-1 gap-2 overflow-x-hidden p-4 pt-0 sm:gap-3 sm:p-5 sm:pt-0 md:grid-cols-4 md:items-stretch md:gap-2 md:p-3 md:pt-0 lg:grid-cols-2 lg:gap-4 lg:p-6 lg:pt-0 [&>*]:min-w-0">
              <Link
                href="/customers?add=1"
                className="group relative flex min-h-[5.25rem] flex-col justify-center gap-0.5 overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-indigo-600 via-brand-600 to-sky-600 bg-[length:200%_200%] bg-[position:0%_50%] p-3 text-white shadow-[0_16px_48px_rgba(37,99,235,0.35),0_4px_16px_rgba(11,34,64,0.12),inset_0_1px_0_rgba(255,255,255,0.25)] transition-[transform,box-shadow,background-position] duration-700 ease-out motion-reduce:transition-none hover:bg-[position:100%_50%] hover:-translate-y-0.5 hover:shadow-[0_20px_56px_rgba(37,99,235,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 sm:min-h-[5.5rem] sm:gap-1 sm:p-4 md:min-h-[6.5rem] md:rounded-xl md:p-2.5 lg:min-h-[5.75rem] lg:rounded-3xl lg:p-5"
              >
                <span
                  className="pointer-events-none absolute -right-4 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl transition-opacity group-hover:opacity-90"
                  aria-hidden
                />
                <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner ring-1 ring-white/30 backdrop-blur-sm sm:h-10 sm:w-10 md:h-8 md:w-8 lg:h-11 lg:w-11 lg:rounded-2xl">
                  <UserPlus
                    className="h-5 w-5 transition-transform duration-500 ease-out motion-reduce:transition-none group-hover:rotate-[18deg] group-hover:scale-105 sm:h-[1.35rem] sm:w-[1.35rem] md:h-4 md:w-4 lg:h-6 lg:w-6"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                </span>
                <span className="relative mt-1.5 line-clamp-2 text-left text-sm font-extrabold leading-tight tracking-tight sm:text-base md:text-[13px] lg:mt-2 lg:text-lg">
                  {t("dashboard_addCustomerCta")}
                </span>
                <span className="relative line-clamp-2 text-left text-[10px] font-semibold leading-snug text-white/85 sm:text-xs md:text-[10px] lg:text-sm">
                  {t("dashboard_addCustomerSub")}
                </span>
              </Link>
              <Link
                href="/proposal"
                className="group relative flex min-h-[5.25rem] flex-col justify-center gap-0.5 overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-600 via-solar-500 to-teal-600 bg-[length:200%_200%] bg-[position:0%_50%] p-3 text-white shadow-[0_16px_48px_rgba(5,150,105,0.32),0_4px_16px_rgba(11,34,64,0.1),inset_0_1px_0_rgba(255,255,255,0.22)] transition-[transform,box-shadow,background-position] duration-700 ease-out motion-reduce:transition-none hover:bg-[position:100%_50%] hover:-translate-y-0.5 hover:shadow-[0_20px_56px_rgba(5,150,105,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 sm:min-h-[5.5rem] sm:gap-1 sm:p-4 md:min-h-[6.5rem] md:rounded-xl md:p-2.5 lg:min-h-[5.75rem] lg:rounded-3xl lg:p-5"
              >
                <span
                  className="pointer-events-none absolute -right-6 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-amber-300/20 blur-2xl"
                  aria-hidden
                />
                <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner ring-1 ring-white/30 backdrop-blur-sm sm:h-10 sm:w-10 md:h-8 md:w-8 lg:h-11 lg:w-11 lg:rounded-2xl">
                  <FileText
                    className="h-5 w-5 transition-transform duration-500 ease-out motion-reduce:transition-none group-hover:-translate-y-0.5 group-hover:rotate-3 sm:h-[1.35rem] sm:w-[1.35rem] md:h-4 md:w-4 lg:h-6 lg:w-6"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                </span>
                <span className="relative mt-1.5 line-clamp-2 text-left text-sm font-extrabold leading-tight tracking-tight sm:text-base md:text-[13px] lg:mt-2 lg:text-lg">
                  {t("actions_newProposal")}
                </span>
                <span className="relative line-clamp-2 text-left text-[10px] font-semibold leading-snug text-white/90 sm:text-xs md:text-[10px] lg:text-sm">
                  {t("dashboard_newProposalSub")}
                </span>
              </Link>
              <Link
                href="/proposal"
                className="inline-flex h-11 w-full min-h-[2.75rem] items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 px-3 text-xs font-semibold text-white shadow-md ring-1 ring-white/15 transition-[filter,transform] hover:brightness-[1.05] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 dark:border-emerald-500/30 dark:from-emerald-500 dark:via-teal-500 dark:to-cyan-600 dark:ring-white/10 sm:h-12 sm:text-sm md:h-full md:min-h-[6.25rem] md:max-w-[10.5rem] md:justify-self-center md:flex-col md:gap-1.5 md:py-2 md:text-[11px] lg:h-12 lg:min-h-12 lg:max-w-none lg:flex-row lg:text-base"
              >
                <Upload className="h-4 w-4 shrink-0 text-white sm:h-5 sm:w-5 md:h-4 md:w-4 lg:h-5 lg:w-5" aria-hidden />
                {t("actions_uploadBill")}
              </Link>
              <Link
                href="/projects"
                className="inline-flex h-11 w-full min-h-[2.75rem] items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 px-3 text-xs font-semibold text-white shadow-md ring-1 ring-white/15 transition-[filter,transform] hover:brightness-[1.05] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 dark:border-emerald-500/30 dark:from-emerald-500 dark:via-teal-600 dark:to-cyan-700 dark:ring-white/10 sm:h-12 sm:text-sm md:h-full md:min-h-[6.25rem] md:max-w-[10.5rem] md:justify-self-center md:flex-col md:gap-1.5 md:py-2 md:text-[11px] lg:h-12 lg:min-h-12 lg:max-w-none lg:flex-row lg:text-base"
              >
                <FolderPlus className="h-4 w-4 shrink-0 text-white sm:h-5 sm:w-5 md:h-4 md:w-4 lg:h-5 lg:w-5" aria-hidden />
                {t("actions_createProject")}
              </Link>
            </CardContent>
          </Card>
        </DashboardItem>
      </DashboardStaggerRoot>
  );
}

export default DashboardPageContent;
