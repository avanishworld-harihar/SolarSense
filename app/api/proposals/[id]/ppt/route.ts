import { NextRequest, NextResponse } from "next/server";
import { getProposalById } from "@/lib/proposals-store";
import { buildPremiumProposalPptBuffer } from "@/lib/proposal-ppt";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type RouteCtx = { params: Promise<{ id: string }> };

function safeName(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim();
  return cleaned.length > 0 ? cleaned : "customer";
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const proposal = await getProposalById(id);
    if (!proposal) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Build a public web link for this proposal so the PPT can embed it as a
    // QR-fallback on slide 11 ("Scan to view this proposal online") when no
    // site photos / UPI link are configured.
    const origin = req.nextUrl.origin
      || process.env.NEXT_PUBLIC_SITE_URL
      || process.env.VERCEL_URL
      || "";
    const baseOrigin = origin.startsWith("http") ? origin : (origin ? `https://${origin}` : "");
    const publicWebUrl = baseOrigin && proposal.share_token
      ? `${baseOrigin.replace(/\/$/, "")}/proposal/${proposal.share_token}`
      : undefined;

    const buffer = await buildPremiumProposalPptBuffer({
      ...proposal.ppt_input,
      webProposalUrl: proposal.ppt_input?.webProposalUrl || publicWebUrl
    });
    const fileName = `${safeName(proposal.customer_name)}-proposal.pptx`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "ppt_failed" },
      { status: 500 }
    );
  }
}
