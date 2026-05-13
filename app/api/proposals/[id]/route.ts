import { NextRequest, NextResponse } from "next/server";
import { mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import { getProposalPricingByProposalId } from "@/lib/proposal-pricing-store";
import { getProposalById, trackProposalView } from "@/lib/proposals-store";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    const proposal = await getProposalById(id);
    if (!proposal) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const pricing = await getProposalPricingByProposalId(proposal.id);
    const mergedInput = mergeProposalPricingIntoPptInput(proposal.ppt_input, pricing);
    const liveSummary = summarizeProposalDeck(mergedInput);

    // Fire-and-forget view counter.
    void trackProposalView(id).catch(() => undefined);

    return NextResponse.json(
      {
        ok: true,
        id: proposal.id,
        customerName: proposal.customer_name,
        generatedAt: proposal.generated_at,
        installer: {
          name: proposal.installer_name,
          contact: proposal.installer_contact,
          tagline: proposal.installer_tagline
        },
        viewCount: proposal.view_count,
        summary: liveSummary,
        pptInput: mergedInput,
        pricing
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "fetch_failed" },
      { status: 500 }
    );
  }
}
