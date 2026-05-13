import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyProposalPricingPatch, defaultProposalPricingFromDeck } from "@/lib/proposal-pricing-merge";
import { proposalPricingPatchSchema } from "@/lib/proposal-pricing-schema";
import {
  ensureProposalPricingRow,
  getProposalPricingByProposalId,
  replaceProposalPricing
} from "@/lib/proposal-pricing-store";
import { persistProposalDeckAfterPricingChange } from "@/lib/proposal-pricing-sync";
import { summarizeProposalDeck } from "@/lib/proposal-ppt";
import { getProposalById } from "@/lib/proposals-store";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    if (!id || !UUID_RX.test(id.trim())) {
      return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }
    const raw = await req.json();
    const patch = proposalPricingPatchSchema.parse(raw);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "empty_patch" }, { status: 400 });
    }

    const proposal = await getProposalById(id.trim());
    if (!proposal) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    let pricing = await getProposalPricingByProposalId(proposal.id);
    if (!pricing) {
      const summary = summarizeProposalDeck(proposal.ppt_input);
      await ensureProposalPricingRow(defaultProposalPricingFromDeck(proposal.id, proposal.ppt_input, summary));
      pricing = await getProposalPricingByProposalId(proposal.id);
    }
    if (!pricing) {
      return NextResponse.json({ ok: false, error: "pricing_unavailable" }, { status: 503 });
    }

    const merged = applyProposalPricingPatch(pricing, patch);
    const saved = await replaceProposalPricing(merged);
    if (!saved) {
      return NextResponse.json({ ok: false, error: "save_failed" }, { status: 503 });
    }

    const synced = await persistProposalDeckAfterPricingChange(proposal.id);
    if (!synced) {
      console.warn("[PATCH pricing] persistProposalDeckAfterPricingChange failed for", proposal.id);
    }

    return NextResponse.json({ ok: true, pricing: saved }, { status: 200, headers: { "Cache-Control": "no-store" } });
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
