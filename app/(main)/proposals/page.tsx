"use client";

import { ProposalHubHeader } from "@/components/proposals/proposal-hub-header";
import { ProposalListCard } from "@/components/proposals/proposal-list-card";
import { ProposalStatusBadge } from "@/components/proposal-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/language-context";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const PROPOSALS_SWR_KEY = "/api/proposals";

type ListPayload = {
  ok?: boolean;
  data?: {
    id: string;
    customer_name: string;
    generated_at: string;
    system_kw: number;
    lead_id: string | null;
    final_amount_inr: number | null;
    panel_brand: string | null;
    annual_saving_inr: number | null;
    proposal_status: string;
  }[];
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
      statusLabel: (s: import("@/lib/proposal-status").ProposalStatus) => t(`proposals_status_${s}`),
      moreActions: t("proposals_cardMoreActions"),
      sheetClose: t("proposals_sheetClose"),
      duplicateProposal: t("proposals_cardDuplicate"),
      archiveProposal: t("proposals_cardArchive")
    }),
    [t]
  );

  return (
    <div className="space-y-6 pb-24">
      <ProposalHubHeader
        title={t("proposals_title")}
        subtitle={t("proposals_hubSubtitle")}
        action={
          <Button asChild variant="emeraldCta" size="lg" className="shadow-lg">
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl md:h-44" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300/80 bg-slate-50/60 p-10 text-center dark:border-white/15 dark:bg-white/[0.03]">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("proposals_empty")}</p>
          <Button asChild className="mt-6" variant="emeraldCta">
            <Link href="/proposal">{t("proposals_newProposalCta")}</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 md:max-lg:block lg:hidden">{t("proposals_hubSplitHint")}</p>

          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <ProposalListCard
                key={row.id}
                id={row.id}
                customerName={row.customer_name}
                generatedAt={row.generated_at}
                systemKw={row.system_kw}
                finalInr={row.final_amount_inr}
                panelBrand={row.panel_brand}
                annualSavingInr={row.annual_saving_inr}
                status={normalizeProposalStatus(row.proposal_status)}
                labels={cardLabels}
              />
            ))}
          </div>

          <div className="hidden md:max-lg:grid md:max-lg:grid-cols-[minmax(260px,42%)_minmax(0,1fr)] md:max-lg:items-stretch md:max-lg:gap-5 lg:hidden">
            <div className="flex max-h-[min(72vh,640px)] flex-col gap-2 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#0c1017]">
              {rows.map((row) => {
                const active = row.id === focusId;
                const st = normalizeProposalStatus(row.proposal_status);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setFocusId(row.id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                      active
                        ? "border-teal-400/80 bg-teal-50/90 dark:border-teal-500/40 dark:bg-teal-950/35"
                        : "border-transparent bg-slate-50/50 hover:bg-slate-100/90 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                    )}
                  >
                    <p className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-50">{row.customer_name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <ProposalStatusBadge status={st} label={t(`proposals_status_${st}`)} />
                      <span className="text-[11px] font-bold tabular-nums text-slate-600 dark:text-slate-300">{row.system_kw} kW</span>
                    </div>
                    <p className="mt-1 text-xs font-bold tabular-nums text-teal-800 dark:text-emerald-300">
                      {row.final_amount_inr != null ? `₹${Math.round(row.final_amount_inr).toLocaleString("en-IN")}` : "—"}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="min-h-[min(72vh,640px)] min-w-0">
              {focused ? (
                <ProposalListCard
                  id={focused.id}
                  customerName={focused.customer_name}
                  generatedAt={focused.generated_at}
                  systemKw={focused.system_kw}
                  finalInr={focused.final_amount_inr}
                  panelBrand={focused.panel_brand}
                  annualSavingInr={focused.annual_saving_inr}
                  status={normalizeProposalStatus(focused.proposal_status)}
                  labels={cardLabels}
                />
              ) : null}
            </div>
          </div>

          <div className="hidden gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <ProposalListCard
                key={row.id}
                id={row.id}
                customerName={row.customer_name}
                generatedAt={row.generated_at}
                systemKw={row.system_kw}
                finalInr={row.final_amount_inr}
                panelBrand={row.panel_brand}
                annualSavingInr={row.annual_saving_inr}
                status={normalizeProposalStatus(row.proposal_status)}
                labels={cardLabels}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
