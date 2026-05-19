import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { commercialProposalConfigSchema } from "@/lib/commercial-proposal-config";
import { persistCommercialConfigChange } from "@/lib/proposal-pricing-sync";
import { proposalTemplateV1Schema } from "@/lib/proposal-template-schema";
import { getProposalById } from "@/lib/proposals-store";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const bodySchema = z.object({
  commercialConfig: commercialProposalConfigSchema,
  proposalLayout: proposalTemplateV1Schema.optional(),
});

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    if (!id || !UUID_RX.test(id.trim())) {
      return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }

    const raw = await req.json();
    const { commercialConfig, proposalLayout } = bodySchema.parse(raw);

    const proposal = await getProposalById(id.trim());
    if (!proposal) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const ok = await persistCommercialConfigChange(id.trim(), commercialConfig, proposalLayout);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "persist_failed" }, { status: 503 });
    }

    const fresh = await getProposalById(id.trim());
    return NextResponse.json(
      {
        ok: true,
        commercialConfig: fresh?.ppt_input?.commercialConfig ?? commercialConfig,
        proposalLayout: fresh?.ppt_input?.proposalLayout,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
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
