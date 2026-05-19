import { notFound } from "next/navigation";
import { WorkspaceDealClient } from "@/components/workspace/workspace-deal-client";
import { defaultProposalPricingFromDeck, mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import { ensureProposalPricingRow, getProposalPricingByProposalId } from "@/lib/proposal-pricing-store";
import { persistProposalDeckAfterPricingChange } from "@/lib/proposal-pricing-sync";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import { getProposalById } from "@/lib/proposals-store";
import { getApprovalTimeline } from "@/lib/proposal-approval-events";
import { getSnapshotsByProposalId } from "@/lib/proposal-snapshot-store";

type PageProps = { params: Promise<{ id: string }> };

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function WorkspaceDealPage({ params }: PageProps) {
  const { id } = await params;
  if (!id || !UUID_RX.test(id.trim())) notFound();

  const proposal = await getProposalById(id.trim());
  if (!proposal) notFound();

  // Ensure pricing row exists — mirrors /proposals/[id] seeding behaviour.
  let pricing = await getProposalPricingByProposalId(proposal.id);
  if (!pricing) {
    const summary = summarizeProposalDeck(proposal.ppt_input);
    await ensureProposalPricingRow(
      defaultProposalPricingFromDeck(proposal.id, proposal.ppt_input, summary, {
        presetId: proposal.preset_id,
      })
    );
    pricing = await getProposalPricingByProposalId(proposal.id);
    void persistProposalDeckAfterPricingChange(proposal.id);
  }

  const merged = mergeProposalPricingIntoPptInput(proposal.ppt_input, pricing);
  const liveSummary = summarizeProposalDeck(merged);
  const annualSavingInr =
    typeof proposal.annual_saving_inr === "number" && Number.isFinite(proposal.annual_saving_inr)
      ? proposal.annual_saving_inr
      : liveSummary.annualSaving;

  // Parallel fetch: timeline + snapshots (gracefully degrade if tables missing)
  const [timeline, snapshots] = await Promise.all([
    getApprovalTimeline(proposal.id),
    getSnapshotsByProposalId(proposal.id),
  ]);

  return (
    <WorkspaceDealClient
      proposalId={proposal.id}
      customerName={proposal.customer_name}
      generatedAt={proposal.generated_at}
      location={proposal.location ?? null}
      presetId={proposal.preset_id ?? "residential_smart"}
      proposalStatus={normalizeProposalStatus(proposal.proposal_status)}
      annualSavingInr={Math.max(0, annualSavingInr)}
      pptInput={merged}
      pricing={pricing}
      timeline={timeline}
      snapshots={snapshots}
    />
  );
}
