import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import { getProposalPricingByProposalId } from "@/lib/proposal-pricing-store";
import { proposalStatusSchema } from "@/lib/proposal-status";
import { getProposalById, trackProposalView, updateProposalStatus } from "@/lib/proposals-store";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const patchBodySchema = z.object({
  proposal_status: proposalStatusSchema
});

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    if (!id || !UUID_RX.test(id.trim())) {
      return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }
    const raw = await req.json();
    const body = patchBodySchema.parse(raw);
    const proposal = await getProposalById(id.trim());
    if (!proposal) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    const ok = await updateProposalStatus(proposal.id, body.proposal_status);
    if (!ok) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 503 });
    return NextResponse.json({ ok: true, proposal_status: body.proposal_status }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
        : error instanceof Error
          ? error.message
          : "patch_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

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
