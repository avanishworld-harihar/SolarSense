"use client";

import { ProposalHubAnalyticsStrip } from "@/components/proposals/proposal-hub-analytics-strip";
import { ProposalHubDealList, type ProposalHubDealRow } from "@/components/proposals/proposal-hub-deal-list";
import { ProposalHubHeader } from "@/components/proposals/proposal-hub-header";
import { ProposalWorkspacePreview } from "@/components/proposals/proposal-workspace-preview";
import { WorkflowLifecycleStrip } from "@/components/workflow-lifecycle-strip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { computeProposalHubStats } from "@/lib/proposal-hub-insights";
import { useLanguage } from "@/lib/language-context";
import type { ProposalStatus } from "@/lib/proposal-status";
import { WorkspacePage } from "@/components/workspace";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const PROPOSALS_SWR_KEY = "/api/proposals";

type ListPayload = {
  ok?: boolean;
  data?: ProposalHubDealRow[];
};

async function fetchProposals(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  return (await r.json()) as ListPayload;
}

export default function ProposalsHubPage() {
  const { t, locale } = useLanguage();
  const { data, error, isLoading } = useSWR(PROPOSALS_SWR_KEY, fetchProposals, { revalidateOnFocus: true, dedupingInterval: 15_000 });
  const rows = data?.ok && Array.isArray(data.data) ? data.data : [];
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (rows.length === 0) {
      setFocusId(null);
      return;
    }
    if (!focusId || !rows.some((r) => r.id === focusId)) {
      setFocusId(rows[0].id);
    }
  }, [rows, focusId]);

  const focused = useMemo(() => rows.find((r) => r.id === focusId) ?? null, [rows, focusId]);
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
      archiveProposal: t("proposals_cardArchive")
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
      nextStepLabel: t("proposals_workspaceNextStepLabel")
    }),
    [t]
  );

  const analyticsLabels = useMemo(
    () => ({
      total: uiLang === "hi" ? "कुल प्रस्ताव" : "Total proposals",
      followUp: uiLang === "hi" ? "फॉलो-अप" : "Need follow-up",
      approved: uiLang === "hi" ? "मंजूर" : "Approved",
      pipeline: uiLang === "hi" ? "पाइपलाइन मूल्य" : "Pipeline value"
    }),
    [uiLang]
  );

  const intelTitle = uiLang === "hi" ? "अगला कदम" : "Recommended next";

  return (
    <WorkspacePage tone="proposals" stagger={false} className="proposal-hub proposal-hub--responsive pb-6 lg:pb-8">
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

      <div className="proposal-hub-lifecycle mt-5 rounded-xl border px-3 py-3 sm:px-4">
        <WorkflowLifecycleStrip surface="proposals-hub" proposalStatus={focused?.proposal_status} />
      </div>

      {error ? (
        <p className="proposal-hub-error mt-5 rounded-xl border p-4 text-sm font-semibold">
          Could not load proposals.
        </p>
      ) : null}

      {isLoading && !data ? (
        <motion.div className="proposal-hub-shell mt-5 hidden min-h-[min(76vh,680px)] lg:grid lg:grid-cols-[minmax(260px,0.36fr)_1fr] lg:gap-0">
          <Skeleton className="h-full min-h-[400px] rounded-none bg-white/[0.04]" />
          <Skeleton className="h-full min-h-[400px] rounded-none bg-white/[0.02]" />
            </motion.div>
      ) : null}
      {isLoading && !data ? (
        <div className="mt-5 space-y-3 lg:hidden">
          <Skeleton className="h-44 rounded-xl bg-white/[0.04]" />
          <Skeleton className="h-64 rounded-xl bg-white/[0.03]" />
        </div>
      ) : null}

      {!isLoading && rows.length === 0 ? (
        <div className="proposal-hub-empty mt-6 rounded-2xl border border-dashed px-6 py-16 text-center">
          <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">{t("proposals_empty")}</p>
          <Button asChild className="proposal-hub-new-btn mt-8 gap-2 font-semibold">
            <Link href="/proposal">
              <Plus className="h-4 w-4" aria-hidden />
              {t("proposals_newProposalCta")}
            </Link>
          </Button>
        </div>
      ) : null}

      {!isLoading && rows.length > 0 ? (
        <>
          <p className="proposal-hub-hint mt-5 hidden text-xs text-slate-500 lg:block">{t("proposals_hubSplitHint")}</p>

          {/* Phone + tablet (< lg) */}
          <div className="proposal-hub-stack mt-4 flex flex-col gap-4 lg:hidden">
            <div className="proposal-hub-glass-panel proposal-hub-shell-list max-h-[min(36dvh,380px)] min-h-0 shrink-0 rounded-2xl border p-3 sm:max-h-[min(32dvh,340px)]">
              <ProposalHubDealList
                rows={rows}
                focusId={focusId}
                onSelect={setFocusId}
                statusLabel={cardLabels.statusLabel}
                groupCountLabel={pipelineLabels.groupCount}
                pipelineLabel={pipelineLabels.pipeline}
                className="h-full min-h-0"
              />
            </div>
            <div className="proposal-hub-glass-panel proposal-hub-shell-workspace rounded-2xl border">
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
                layout="flow"
              />
            </div>
          </div>

          {/* Desktop split (lg+) */}
          <div
            className={cn(
              "proposal-hub-shell proposal-hub-glass-panel mt-5 hidden min-h-0 lg:grid",
              "lg:h-[min(calc(100dvh-12rem),760px)]",
              "lg:grid-cols-[minmax(280px,0.32fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]",
              "lg:overflow-hidden lg:rounded-2xl lg:border"
            )}
          >
            <div className="proposal-hub-shell-list flex h-full min-h-0 flex-col overflow-hidden border-r p-4 lg:pr-5">
              <ProposalHubDealList
                rows={rows}
                focusId={focusId}
                onSelect={setFocusId}
                statusLabel={cardLabels.statusLabel}
                groupCountLabel={pipelineLabels.groupCount}
                pipelineLabel={pipelineLabels.pipeline}
                className="h-full min-h-0"
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
              />
            </div>
          </div>
        </>
      ) : null}
    </WorkspacePage>
  );
}
