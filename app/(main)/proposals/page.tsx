"use client";

import { ProposalHubHeader } from "@/components/proposals/proposal-hub-header";
import { ProposalListCard } from "@/components/proposals/proposal-list-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/language-context";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import Link from "next/link";
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
            <Skeleton key={i} className="h-44 rounded-2xl" />
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
              labels={{
                kw: t("proposals_kwLabel"),
                editPricing: t("proposals_cardEditPricing"),
                openProposal: t("proposals_cardOpenProposal"),
                pdfQuote: t("proposals_cardPdfQuote"),
                send: t("proposals_cardSend"),
                comingSoon: t("proposals_comingSoon"),
                panelBrand: t("proposals_panelBrand"),
                estSavingMo: t("proposals_estSavingMo"),
                netPayable: t("proposals_netLabel"),
                statusLabel: (s) => t(`proposals_status_${s}`)
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
