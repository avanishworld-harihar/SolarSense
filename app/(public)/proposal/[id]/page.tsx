import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLeadSurveyCompleteForProposal } from "@/lib/proposal-survey-gate";
import { getLeadSurveyStatus } from "@/lib/supabase";
import { mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import { getProposalPricingByProposalId } from "@/lib/proposal-pricing-store";
import { getProposalById, trackProposalView } from "@/lib/proposals-store";
import { isProposalBillAuditBacked } from "@/lib/proposal-bill-audit-eligibility";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import ProposalView from "./proposal-view";
import CommercialProposalView from "@/components/proposal/commercial-proposal-view";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const proposal = await getProposalById(id);
  if (!proposal) return { title: "Solar Proposal" };
  const installer = proposal.installer_name ?? "Harihar Solar";
  const pricing = await getProposalPricingByProposalId(proposal.id);
  const merged = mergeProposalPricingIntoPptInput(proposal.ppt_input, pricing);
  const summary = summarizeProposalDeck(merged);
  const saving = summary?.annualSaving ?? 0;
  const isCommercial = proposal.preset_id === "commercial_executive";
  return {
    title: `${proposal.customer_name} — ${isCommercial ? "Commercial Solar Proposal" : "Solar Proposal"} · ${installer}`,
    description: `${isCommercial ? "Commercial" : "Personalised"} ${summary?.systemKw ?? ""} kW solar proposal · ${saving > 0 ? `₹${saving.toLocaleString("en-IN")}/yr saving · ` : ""}Net cost ₹${(summary?.netCost ?? 0).toLocaleString("en-IN")}.`,
    openGraph: {
      title: `${proposal.customer_name}${isCommercial ? " — Commercial Solar Intelligence Report" : "'s Solar Proposal"}`,
      description: `${summary?.systemKw ?? ""} kW system from ${installer}.`,
      type: "website",
    },
  };
}

export default async function PublicProposalPage({ params }: PageProps) {
  const { id } = await params;
  const proposal = await getProposalById(id);
  if (!proposal) notFound();

  const pricing = await getProposalPricingByProposalId(proposal.id);
  const mergedInput = mergeProposalPricingIntoPptInput(proposal.ppt_input, pricing);
  const liveSummary = summarizeProposalDeck(mergedInput);

  void trackProposalView(id).catch(() => undefined);

  const rawPptInput = proposal.ppt_input as Record<string, unknown> | null | undefined;
  const siteImages = Array.isArray(rawPptInput?.siteImages)
    ? (rawPptInput?.siteImages as string[])
    : undefined;
  const installerLogoUrl =
    typeof rawPptInput?.installerLogoUrl === "string"
      ? (rawPptInput?.installerLogoUrl as string)
      : undefined;

  const installerProps = {
    name: proposal.installer_name ?? liveSummary.installer,
    contact: proposal.installer_contact ?? liveSummary.contact,
    tagline: proposal.installer_tagline ?? liveSummary.tagline,
  };

  // ── Commercial executive preset — render the premium commercial view ──────
  if (proposal.preset_id === "commercial_executive") {
    return (
      <CommercialProposalView
        id={id}
        customerName={proposal.customer_name}
        generatedAt={proposal.generated_at}
        summary={liveSummary}
        pptInput={mergedInput}
        installer={installerProps}
        siteImages={siteImages}
        installerLogoUrl={installerLogoUrl}
      />
    );
  }

  // ── Residential / legacy — render existing ProposalView ──────────────────
  const leadId = proposal.lead_id?.trim() ? proposal.lead_id.trim() : null;
  const surveyStatus = await getLeadSurveyStatus(leadId);
  const showSurveyWorkflowSection = isLeadSurveyCompleteForProposal(surveyStatus);
  const billAuditBacked = isProposalBillAuditBacked(mergedInput);

  return (
    <ProposalView
      id={id}
      summary={liveSummary}
      billAuditBacked={billAuditBacked}
      installer={installerProps}
      customerName={proposal.customer_name}
      generatedAt={proposal.generated_at}
      siteImages={siteImages}
      installerLogoUrl={installerLogoUrl}
      showSurveyWorkflowSection={showSurveyWorkflowSection}
    />
  );
}
