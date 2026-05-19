import { NextResponse } from "next/server";
import { getQuotationById, updateQuotation, markQuotationSent } from "@/lib/quotations-store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/quotations/[id] */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const row = await getQuotationById(id);
    if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: row });
  } catch (err) {
    console.error("[api/quotations/[id]] GET:", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

/** PATCH /api/quotations/[id] */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const body = (await req.json()) as Record<string, unknown>;

    // Handle special action: mark sent
    if (body.action === "send") {
      const ok = await markQuotationSent(id);
      if (!ok) return NextResponse.json({ ok: false, error: "send_failed" }, { status: 500 });
      const updated = await getQuotationById(id);
      return NextResponse.json({ ok: true, data: updated });
    }

    const row = await updateQuotation(id, {
      ...(typeof body.customer_name === "string" && { customer_name: body.customer_name }),
      ...(typeof body.customer_phone === "string" && { customer_phone: body.customer_phone }),
      ...(typeof body.site_address === "string" && { site_address: body.site_address }),
      ...(typeof body.system_kw === "number" && { system_kw: body.system_kw }),
      ...(typeof body.hardware_inr === "number" && { hardware_inr: body.hardware_inr }),
      ...(typeof body.installation_inr === "number" && { installation_inr: body.installation_inr }),
      ...(typeof body.subsidy_inr === "number" && { subsidy_inr: body.subsidy_inr }),
      ...(typeof body.discount_inr === "number" && { discount_inr: body.discount_inr }),
      ...(typeof body.final_amount_inr === "number" && { final_amount_inr: body.final_amount_inr }),
      ...(typeof body.payment_terms === "string" && { payment_terms: body.payment_terms }),
      ...(typeof body.validity_days === "number" && { validity_days: body.validity_days }),
      ...(typeof body.status === "string" && { status: body.status as "draft" }),
    });

    if (!row) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    return NextResponse.json({ ok: true, data: row });
  } catch (err) {
    console.error("[api/quotations/[id]] PATCH:", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
