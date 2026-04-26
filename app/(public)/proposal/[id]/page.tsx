import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProposalById, trackProposalView } from "@/lib/proposals-store";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import ProposalView from "./proposal-view";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const proposal = await getProposalById(id);
  if (!proposal) return { title: "Solar Proposal" };
  const installer = proposal.installer_name ?? "Harihar Solar";
  const summary = proposal.summary;
  const saving = summary?.annualSaving ?? 0;
  return {
    title: `${proposal.customer_name} — Solar Proposal · ${installer}`,
    description: `Personalised ${summary?.systemKw ?? ""} kW solar proposal · ${saving > 0 ? `₹${saving.toLocaleString("en-IN")}/yr saving · ` : ""}Net cost ₹${(summary?.netCost ?? 0).toLocaleString("en-IN")}.`,
    openGraph: {
      title: `${proposal.customer_name}'s Solar Proposal`,
      description: `${summary?.systemKw ?? ""} kW system from ${installer}.`,
      type: "website"
    }
  };
}

export default async function PublicProposalPage({ params }: PageProps) {
  const { id } = await params;
  const proposal = await getProposalById(id);
  if (!proposal) notFound();

  // Live recompute so any tariff engine improvements are reflected.
  const liveSummary = summarizeProposalDeck(proposal.ppt_input);

  void trackProposalView(id).catch(() => undefined);

  const pptInput = proposal.ppt_input as Record<string, unknown> | null | undefined;
  const siteImages = Array.isArray(pptInput?.siteImages) ? (pptInput?.siteImages as string[]) : undefined;
  const installerLogoUrl = typeof pptInput?.installerLogoUrl === "string" ? (pptInput?.installerLogoUrl as string) : undefined;

  return (
    <ProposalView
      id={id}
      summary={liveSummary}
      installer={{
        name: proposal.installer_name ?? liveSummary.installer,
        contact: proposal.installer_contact ?? liveSummary.contact,
        tagline: proposal.installer_tagline ?? liveSummary.tagline
      }}
      customerName={proposal.customer_name}
      generatedAt={proposal.generated_at}
      siteImages={siteImages}
      installerLogoUrl={installerLogoUrl}
    />
  );
}
