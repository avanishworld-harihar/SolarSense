import { notFound } from "next/navigation";
import { ProposalManageClient } from "@/components/proposals/proposal-manage-client";
import { defaultProposalPricingFromDeck, mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import { ensureProposalPricingRow, getProposalPricingByProposalId } from "@/lib/proposal-pricing-store";
import { persistProposalDeckAfterPricingChange } from "@/lib/proposal-pricing-sync";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import { getProposalById } from "@/lib/proposals-store";

type PageProps = { params: Promise<{ id: string }> };

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ProposalManagePage({ params }: PageProps) {
  const { id } = await params;
  if (!id || !UUID_RX.test(id.trim())) notFound();

  const proposal = await getProposalById(id.trim());
  if (!proposal) notFound();

  let pricing = await getProposalPricingByProposalId(proposal.id);
  if (!pricing) {
    const summary = summarizeProposalDeck(proposal.ppt_input);
    await ensureProposalPricingRow(defaultProposalPricingFromDeck(proposal.id, proposal.ppt_input, summary));
    await persistProposalDeckAfterPricingChange(proposal.id);
    pricing = await getProposalPricingByProposalId(proposal.id);
  }

  const merged = mergeProposalPricingIntoPptInput(proposal.ppt_input, pricing);

  return (
    <ProposalManageClient
      proposalId={proposal.id}
      customerName={proposal.customer_name}
      generatedAt={proposal.generated_at}
      pptInput={merged}
      pricing={pricing}
    />
  );
}
