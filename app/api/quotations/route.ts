import { NextResponse } from "next/server";
import { createQuotation, listQuotations } from "@/lib/quotations-store";

export const dynamic = "force-dynamic";

/** GET /api/quotations?proposalId=... */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const proposalId = searchParams.get("proposalId") ?? undefined;
    const rows = await listQuotations(proposalId);
    return NextResponse.json({ ok: true, data: rows });
  } catch (err) {
    console.error("[api/quotations] GET:", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

/** POST /api/quotations — body: CreateQuotationInput */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const customerName = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
    if (!customerName) {
      return NextResponse.json({ ok: false, error: "customer_name required" }, { status: 400 });
    }

    const row = await createQuotation({
      customer_name: customerName,
      customer_phone: typeof body.customer_phone === "string" ? body.customer_phone : null,
      site_address: typeof body.site_address === "string" ? body.site_address : null,
      proposal_id: typeof body.proposal_id === "string" ? body.proposal_id : null,
      pricing_snapshot_id: typeof body.pricing_snapshot_id === "string" ? body.pricing_snapshot_id : null,
      system_kw: typeof body.system_kw === "number" ? body.system_kw : null,
      hardware_inr: typeof body.hardware_inr === "number" ? body.hardware_inr : null,
      installation_inr: typeof body.installation_inr === "number" ? body.installation_inr : null,
      subsidy_inr: typeof body.subsidy_inr === "number" ? body.subsidy_inr : null,
      discount_inr: typeof body.discount_inr === "number" ? body.discount_inr : null,
      final_amount_inr: typeof body.final_amount_inr === "number" ? body.final_amount_inr : null,
      payment_terms: typeof body.payment_terms === "string" ? body.payment_terms : null,
      validity_days: typeof body.validity_days === "number" ? body.validity_days : 30,
    });

    if (!row) {
      return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (err) {
    console.error("[api/quotations] POST:", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
