"use client";

/**
 * /proposals — E3 Proposal Mission Control
 *
 * Default view: Pipeline (Kanban) — visual, status-grouped, deal-centric.
 * Alt views: Grid (cards), List (split-pane, existing architecture preserved).
 *
 * What changed (E3):
 *   + Pipeline board (default)
 *   + Grid view
 *   + View mode toggle (pipeline/grid/list)
 *   + Search + status filter bar
 *   + Premium empty state
 *   + Commercial vs residential visual differentiation on cards
 *   + Health score, velocity, confidence on each deal card
 *   + Sticky summary strip (analytics)
 *   + Quick-create CTA
 *
 * What was preserved (unchanged):
 *   - All existing proposal generation logic
 *   - ProposalHubDealList (used as "list" view)
 *   - ProposalWorkspacePreview (used as "list" view detail pane)
 *   - All routes, APIs, database operations
 *   - dedupeLatestProposals, countHiddenByDedupe
 *   - ProposalHubAnalyticsStrip (still shown at top)
 *   - WorkflowLifecycleStrip
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspacePage } from "@/components/workspace";

// Existing components (preserved)
import { ProposalHubAnalyticsStrip } from "@/components/proposals/proposal-hub-analytics-strip";
import { ProposalHubDealList, type ProposalHubDealRow } from "@/components/proposals/proposal-hub-deal-list";
import { ProposalHubHeader } from "@/components/proposals/proposal-hub-header";
import { ProposalWorkspacePreview } from "@/components/proposals/proposal-workspace-preview";
import { ProposalHubMobileNav } from "@/components/proposals/proposal-hub-mobile-nav";
import { WorkflowLifecycleStrip } from "@/components/workflow-lifecycle-strip";

// New E3 components
import { HubPipelineBoard } from "@/components/proposals/hub-pipeline-board";
import { HubViewToggle, readViewMode, writeViewMode, type HubViewMode } from "@/components/proposals/hub-view-toggle";
import { HubSearchFilter } from "@/components/proposals/hub-search-filter";
import { HubEmptyState } from "@/components/proposals/hub-empty-state";
import { DealCard } from "@/components/proposals/deal-card";

// Lib
import { countHiddenByDedupe, dedupeLatestProposals } from "@/lib/proposal-hub-dedupe";
import { computeProposalHubStats } from "@/lib/proposal-hub-insights";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import type { ProposalStatus } from "@/lib/proposal-status";

const PROPOSALS_SWR_KEY = "/api/proposals";

type ListPayload = { ok?: boolean; data?: ProposalHubDealRow[] };

async function fetchProposals(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  return (await r.json()) as ListPayload;
}

export default function ProposalsHubPage() {
  const searchParams = useSearchParams();
  const dealFromUrl = searchParams.get("deal")?.trim() || null;
  const { t, locale } = useLanguage();
  const { data, error, isLoading, mutate } = useSWR(PROPOSALS_SWR_KEY, fetchProposals, {
    revalidateOnFocus: true,
    dedupingInterval: 15_000,
  });

  const allRows = data?.ok && Array.isArray(data.data) ? data.data : [];
  const [showAllVersions, setShowAllVersions] = useState(false);
  const rows = useMemo(
    () => (showAllVersions ? allRows : dedupeLatestProposals(allRows)),
    [allRows, showAllVersions]
  );
  const hiddenCount = useMemo(() => countHiddenByDedupe(allRows, rows), [allRows, rows]);

  // View mode — persisted to localStorage
  const [viewMode, setViewMode] = useState<HubViewMode>("pipeline");
  useEffect(() => { setViewMode(readViewMode()); }, []);
  const handleViewChange = (mode: HubViewMode) => {
    setViewMode(mode);
    writeViewMode(mode);
  };

  // Search + filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<ProposalStatus | null>(null);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (activeStatus) {
      result = result.filter((r) => normalizeProposalStatus(r.proposal_status) === activeStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(q) ||
          (r.panel_brand ?? "").toLowerCase().includes(q) ||
          String(r.system_kw).includes(q)
      );
    }
    return result;
  }, [rows, searchQuery, activeStatus]);

  // Focus / workspace pane (for list view and mobile)
  const [focusId, setFocusId] = useState<string | null>(null);
  const pipelineRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const [pipelineVisible, setPipelineVisible] = useState(true);

  useEffect(() => {
    if (dealFromUrl && filteredRows.some((r) => r.id === dealFromUrl)) {
      setFocusId(dealFromUrl);
      requestAnimationFrame(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [dealFromUrl, filteredRows]);

  useEffect(() => {
    if (filteredRows.length === 0) { setFocusId(null); return; }
    if (!focusId || !filteredRows.some((r) => r.id === focusId)) {
      setFocusId(filteredRows[0].id);
    }
  }, [filteredRows, focusId]);

  const focused = useMemo(() => filteredRows.find((r) => r.id === focusId) ?? null, [filteredRows, focusId]);
  const stats = useMemo(() => computeProposalHubStats(rows), [rows]);
  const uiLang = locale === "en" ? "en" : "hi";

  const cardLabels = useMemo(
    () => ({
      kw: t("proposals_kwLabel"),
      editPricing: t("proposals_cardEditPricing"),
      openProposal: t("proposals_cardOpenProposal"),
      openWorkspace: t("proposals_cardOpenWorkspace"),
      previewPublic: t("proposals_cardPreviewPublic"),
      pdfQuote: t("proposals_cardPdfQuote"),
      send: t("proposals_cardSend"),
      comingSoon: t("proposals_comingSoon"),
      panelBrand: t("proposals_panelBrand"),
      estSavingMo: t("proposals_estSavingMo"),
      netPayable: t("proposals_netLabel"),
      statusLabel: (s: ProposalStatus) => t(`proposals_status_${s}`),
      moreActions: t("proposals_cardMoreActions"),
      sheetClose: t("proposals_sheetClose"),
      duplicateProposal: t("proposals_cardDuplicate"),
      archiveProposal: t("proposals_cardArchive"),
      deleteProposal: t("proposals_deleteProposal"),
      deleteConfirm: t("proposals_deleteConfirm"),
      deleteDone: t("proposals_deleteDone"),
      deleteFailed: t("proposals_deleteFailed"),
      sendDone: t("proposals_sendDone"),
      pptFailed: t("proposals_pptFailed"),
    }),
    [t]
  );

  const pipelineLabels = useMemo(
    () => ({
      pipeline: t("proposals_dealsPipelineLabel"),
      groupCount: (n: number) => t("proposals_pipelineGroupCount", { n }),
      summaryTitle: t("proposals_workspaceSummaryTitle"),
      nextAction: t("proposals_workspaceNextActionHint"),
      empty: t("proposals_workspaceEmpty"),
      paneEyebrow: t("proposals_workspacePaneEyebrow"),
      nextStepLabel: t("proposals_workspaceNextStepLabel"),
    }),
    [t]
  );

  const analyticsLabels = useMemo(
    () => ({
      total: uiLang === "hi" ? "कुल प्रस्ताव" : "Total proposals",
      followUp: uiLang === "hi" ? "फॉलो-अप" : "Need follow-up",
      approved: uiLang === "hi" ? "मंजूर" : "Approved",
      pipeline: uiLang === "hi" ? "पाइपलाइन मूल्य" : "Pipeline value",
    }),
    [uiLang]
  );

  const intelTitle = uiLang === "hi" ? "अगला कदम" : "Recommended next";

  const refreshList = useCallback(() => { void mutate(); }, [mutate]);

  const scrollToPipeline = useCallback(() => {
    pipelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToWorkspace = useCallback(() => {
    workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const selectDeal = (id: string) => {
    setFocusId(id);
    requestAnimationFrame(() => { scrollToWorkspace(); });
  };

  useEffect(() => {
    const el = pipelineRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setPipelineVisible(entry?.isIntersecting ?? true),
      { root: null, rootMargin: "-56px 0px 0px 0px", threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isLoading, rows.length]);

  const hasData = !isLoading && allRows.length > 0;
  const hasFiltered = filteredRows.length > 0;

  return (
    <WorkspacePage tone="proposals" stagger={false} className="proposal-hub proposal-hub--responsive pb-6 lg:pb-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <ProposalHubHeader
        variant="workspace"
        title={t("proposals_title")}
        subtitle={t("proposals_hubSubtitle")}
        analytics={
          !isLoading && rows.length > 0 ? (
            <ProposalHubAnalyticsStrip stats={stats} labels={analyticsLabels} />
          ) : null
        }
        action={
          <Button asChild size="default" className="proposal-hub-new-btn gap-2 font-semibold shadow-lg">
            <Link href="/proposal">
              <Plus className="h-4 w-4" aria-hidden />
              {t("proposals_newProposalCta")}
            </Link>
          </Button>
        }
      />

      {/* ── Lifecycle strip ──────────────────────────────────────────────── */}
      <div className="proposal-hub-lifecycle mt-5 rounded-xl border px-3 py-3 sm:px-4">
        <WorkflowLifecycleStrip surface="proposals-hub" proposalStatus={focused?.proposal_status} />
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error ? (
        <p className="proposal-hub-error mt-5 rounded-xl border p-4 text-sm font-semibold">
          Could not load proposals.
        </p>
      ) : null}

      {/* ── Loading skeletons ────────────────────────────────────────────── */}
      {isLoading && !data ? (
        <>
          <div className="mt-5 hidden space-y-3 lg:block">
            <Skeleton className="h-9 w-full rounded-xl bg-white/[0.06]" />
            <div className="flex gap-4 overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-80 w-64 shrink-0 rounded-2xl bg-white/[0.04]" />
              ))}
            </div>
          </div>
          <div className="mt-5 space-y-3 lg:hidden">
            <Skeleton className="h-9 w-full rounded-xl bg-white/[0.06]" />
            <Skeleton className="h-64 rounded-2xl bg-white/[0.04]" />
            <Skeleton className="h-48 rounded-2xl bg-white/[0.03]" />
          </div>
        </>
      ) : null}

      {/* ── Empty state (no proposals at all) ───────────────────────────── */}
      {!isLoading && allRows.length === 0 ? (
        <div className="mt-6">
          <HubEmptyState variant="no-proposals" />
        </div>
      ) : null}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      {hasData ? (
        <>
          {/* Controls bar: view toggle + version dedupe
               Mobile: stacked column so neither item wraps unexpectedly.
               sm+: single flex row with space-between. */}
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <HubViewToggle value={viewMode} onChange={handleViewChange} />

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Version dedupe toggle */}
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600"
                  checked={showAllVersions}
                  onChange={(e) => setShowAllVersions(e.target.checked)}
                />
                {showAllVersions ? t("proposals_showAllVersions") : t("proposals_showLatestOnly")}
              </label>
              {!showAllVersions && hiddenCount > 0 ? (
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {t("proposals_hiddenVersionsHint", { n: hiddenCount })}
                </p>
              ) : null}
            </div>
          </div>

          {/* Search + filter bar */}
          <div className="mt-4">
            <HubSearchFilter
              query={searchQuery}
              onQueryChange={setSearchQuery}
              activeStatus={activeStatus}
              onStatusChange={setActiveStatus}
              resultCount={filteredRows.length}
            />
          </div>

          {/* ── Pipeline view (default) ──────────────────────────────────── */}
          {viewMode === "pipeline" && (
            <div className="mt-5">
              {hasFiltered ? (
                <HubPipelineBoard
                  rows={filteredRows}
                  focusId={focusId}
                  onSelect={setFocusId}
                  lang={uiLang}
                />
              ) : (
                <HubEmptyState
                  variant="no-results"
                  onClearFilter={() => { setSearchQuery(""); setActiveStatus(null); }}
                />
              )}
            </div>
          )}

          {/* ── Grid view ────────────────────────────────────────────────── */}
          {viewMode === "grid" && (
            <div className="mt-5">
              {hasFiltered ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {filteredRows.map((row, i) => (
                    <DealCard
                      key={row.id}
                      row={row}
                      density="grid"
                      active={row.id === focusId}
                      lang={uiLang}
                      onClick={setFocusId}
                      delay={i}
                    />
                  ))}
                </motion.div>
              ) : (
                <HubEmptyState
                  variant="no-results"
                  onClearFilter={() => { setSearchQuery(""); setActiveStatus(null); }}
                />
              )}
            </div>
          )}

          {/* ── List view (existing split-pane — fully preserved) ────────── */}
          {viewMode === "list" && (
            <>
              <p className="proposal-hub-hint mt-5 hidden text-xs text-slate-500 lg:block">
                {t("proposals_hubSplitHint")}
              </p>

              {/* Mobile sticky nav */}
              <ProposalHubMobileNav
                visible={!pipelineVisible && !!focused}
                customerName={focused?.customer_name ?? ""}
                onShowPipeline={scrollToPipeline}
                lang={uiLang}
              />
              <p className="proposal-hub-mobile-hint mt-4 text-center text-xs md:hidden">
                {uiLang === "hi"
                  ? "ग्राहक चुनें — नीचे वर्कस्पेस खुलेगा।"
                  : "Tap a customer — workspace opens below."}
              </p>

              {/* Phone: stacked list + workspace */}
              {hasFiltered ? (
                <div className="proposal-hub-mobile-stack mt-3 flex flex-col gap-4 md:hidden">
                  <section
                    ref={pipelineRef}
                    id="proposal-hub-pipeline"
                    aria-label={pipelineLabels.pipeline}
                    className="proposal-hub-glass-panel proposal-hub-mobile-list scroll-mt-20 rounded-2xl border p-3"
                  >
                    <ProposalHubDealList
                      rows={filteredRows}
                      focusId={focusId}
                      onSelect={selectDeal}
                      statusLabel={cardLabels.statusLabel}
                      groupCountLabel={pipelineLabels.groupCount}
                      pipelineLabel={pipelineLabels.pipeline}
                      showVersionTag={showAllVersions}
                    />
                  </section>
                  <section
                    ref={workspaceRef}
                    id="proposal-hub-active-workspace"
                    aria-label={pipelineLabels.paneEyebrow}
                    className="proposal-hub-glass-panel proposal-hub-mobile-workspace scroll-mt-24 rounded-2xl border"
                  >
                    <ProposalWorkspacePreview
                      row={focused}
                      labels={cardLabels}
                      summaryTitle={pipelineLabels.summaryTitle}
                      nextActionHint={pipelineLabels.nextAction}
                      emptyLabel={pipelineLabels.empty}
                      paneEyebrow={pipelineLabels.paneEyebrow}
                      nextStepLabel={pipelineLabels.nextStepLabel}
                      lang={uiLang}
                      intelTitle={intelTitle}
                      layout="mobile"
                      onScrollToPipeline={scrollToPipeline}
                      onDeleted={refreshList}
                      onSent={refreshList}
                    />
                  </section>
                </div>
              ) : (
                <div className="mt-5 md:hidden">
                  <HubEmptyState
                    variant="no-results"
                    onClearFilter={() => { setSearchQuery(""); setActiveStatus(null); }}
                  />
                </div>
              )}

              {/* Desktop split pane (lg+) — fully original */}
              <div
                className={cn(
                  "proposal-hub-shell proposal-hub-glass-panel mt-5 hidden min-h-0 md:grid",
                  "md:h-[min(calc(100dvh-11rem),720px)]",
                  "md:grid-cols-[minmax(240px,0.34fr)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]",
                  "md:overflow-hidden md:rounded-2xl md:border",
                  "lg:h-[min(calc(100dvh-12rem),760px)] lg:grid-cols-[minmax(280px,0.32fr)_minmax(0,1fr)]"
                )}
              >
                <div className="proposal-hub-shell-list flex h-full min-h-0 flex-col overflow-hidden border-r p-4 lg:pr-5">
                  <ProposalHubDealList
                    rows={filteredRows}
                    focusId={focusId}
                    onSelect={setFocusId}
                    statusLabel={cardLabels.statusLabel}
                    groupCountLabel={pipelineLabels.groupCount}
                    pipelineLabel={pipelineLabels.pipeline}
                    className="h-full min-h-0"
                    showVersionTag={showAllVersions}
                  />
                </div>
                <div className="proposal-hub-shell-workspace flex h-full min-h-0 flex-col overflow-hidden">
                  <ProposalWorkspacePreview
                    row={focused}
                    labels={cardLabels}
                    summaryTitle={pipelineLabels.summaryTitle}
                    nextActionHint={pipelineLabels.nextAction}
                    emptyLabel={pipelineLabels.empty}
                    paneEyebrow={pipelineLabels.paneEyebrow}
                    nextStepLabel={pipelineLabels.nextStepLabel}
                    lang={uiLang}
                    intelTitle={intelTitle}
                    layout="pane"
                    onDeleted={refreshList}
                    onSent={refreshList}
                  />
                </div>
              </div>
            </>
          )}
        </>
      ) : null}
    </WorkspacePage>
  );
}
