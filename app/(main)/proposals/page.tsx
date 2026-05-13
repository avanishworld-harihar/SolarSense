"use client";

import { ProposalHubDealList, type ProposalHubDealRow } from "@/components/proposals/proposal-hub-deal-list";
import { ProposalHubHeader } from "@/components/proposals/proposal-hub-header";
import { ProposalWorkspacePreview } from "@/components/proposals/proposal-workspace-preview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/language-context";
import type { ProposalStatus } from "@/lib/proposal-status";
import Link from "next/link";
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
  const { t } = useLanguage();
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
      empty: t("proposals_workspaceEmpty")
    }),
    [t]
  );

  return (
    <div className="space-y-6 pb-24">
      <ProposalHubHeader
        variant="workspace"
        title={t("proposals_title")}
        subtitle={t("proposals_hubSubtitle")}
        action={
          <Button asChild variant="emeraldCta" size="lg" className="shadow-md">
            <Link href="/proposal">{t("proposals_newProposalCta")}</Link>
          </Button>
        }
      />

      {error && (
        <p className="rounded-2xl border border-rose-200/80 bg-rose-50/90 p-4 text-sm font-semibold text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-100">
          Could not load proposals.
        </p>
      )}

      {isLoading && !data ? (
        <div className="hidden md:grid md:grid-cols-[minmax(260px,38%)_minmax(0,1fr)] md:items-stretch md:gap-5">
          <Skeleton className="h-[min(72vh,640px)] rounded-xl" />
          <Skeleton className="h-[min(72vh,640px)] rounded-xl" />
        </div>
      ) : null}
      {isLoading && !data ? (
        <div className="space-y-3 md:hidden">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : null}

      {!isLoading && rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/60 p-10 text-center dark:border-white/15 dark:bg-white/[0.03]">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("proposals_empty")}</p>
          <Button asChild className="mt-6" variant="emeraldCta">
            <Link href="/proposal">{t("proposals_newProposalCta")}</Link>
          </Button>
        </div>
      ) : null}

      {!isLoading && rows.length > 0 ? (
        <>
          <p className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 md:block">{t("proposals_hubSplitHint")}</p>

          <div className="flex flex-col gap-4 md:hidden">
            <div className="max-h-[min(44vh,380px)] min-h-0 shrink-0">
              <ProposalHubDealList
                rows={rows}
                focusId={focusId}
                onSelect={setFocusId}
                statusLabel={cardLabels.statusLabel}
                groupCountLabel={pipelineLabels.groupCount}
                pipelineLabel={pipelineLabels.pipeline}
                className="max-h-full"
              />
            </div>
            <ProposalWorkspacePreview
              row={focused}
              labels={cardLabels}
              summaryTitle={pipelineLabels.summaryTitle}
              nextActionHint={pipelineLabels.nextAction}
              emptyLabel={pipelineLabels.empty}
            />
          </div>

          <div className="hidden min-h-0 md:grid md:grid-cols-[minmax(260px,38%)_minmax(0,1fr)] md:items-stretch md:gap-5">
            <div className="flex min-h-[min(72vh,640px)] max-h-[min(80vh,720px)] flex-col">
              <ProposalHubDealList
                rows={rows}
                focusId={focusId}
                onSelect={setFocusId}
                statusLabel={cardLabels.statusLabel}
                groupCountLabel={pipelineLabels.groupCount}
                pipelineLabel={pipelineLabels.pipeline}
              />
            </div>
            <div className="min-h-[min(72vh,640px)] max-h-[min(80vh,720px)] min-w-0 overflow-y-auto">
              <ProposalWorkspacePreview
                row={focused}
                labels={cardLabels}
                summaryTitle={pipelineLabels.summaryTitle}
                nextActionHint={pipelineLabels.nextAction}
                emptyLabel={pipelineLabels.empty}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
