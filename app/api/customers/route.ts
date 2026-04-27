import { NextRequest, NextResponse } from "next/server";
import { listCustomers } from "@/lib/supabase";
import { processInboundLead } from "@/lib/inbound-leads";
import type { CustomerLead } from "@/lib/types";
import { z } from "zod";

function mapCustomerRow(row: Record<string, unknown>): CustomerLead {
  const phoneRaw = row.phone;
  const phone =
    phoneRaw != null && String(phoneRaw).trim() ? String(phoneRaw).trim() : null;
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    city: String(row.city ?? ""),
    discom: String(row.discom ?? ""),
    monthly_bill: Number(row.monthly_bill ?? row.monthlyBill ?? 0) || 0,
    status: String(row.status ?? "new"),
    phone,
    source: row.source != null ? String(row.source) : null,
    last_touched_at: row.last_touched_at != null ? String(row.last_touched_at) : null,
    state: row.state != null ? String(row.state) : null,
    email: row.email != null ? String(row.email) : null
  };
}

const customerSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  discom: z.string().min(2),
  monthly_bill: z.number().nonnegative(),
  status: z.string().optional(),
  phone: z.string().optional(),
  state: z.string().optional(),
  email: z.string().email().optional()
});

export async function GET() {
  try {
    const raw = await listCustomers();
    const customers = (raw as Record<string, unknown>[]).map(mapCustomerRow);
    return NextResponse.json({ ok: true, data: customers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load customers";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = customerSchema.parse(body);
    /**
     * Route through `processInboundLead` so the manual add-modal gets the same
     * phone dedup + `last_touched_at` stamping as all other ingestion paths.
     * The response includes `deduped: true` when the phone already existed —
     * the customers page surfaces a "Lead already in CRM" info toast.
     */
    const result = await processInboundLead({
      name: payload.name,
      phone: payload.phone ?? "",
      city: payload.city,
      state: payload.state ?? null,
      discom: payload.discom,
      monthly_bill: payload.monthly_bill,
      email: payload.email ?? null,
      source: "manual"
    });
    const mappedData = mapCustomerRow(result.data as Record<string, unknown>);
    return NextResponse.json(
      { ok: true, deduped: result.deduped, data: mappedData },
      { status: result.deduped ? 200 : 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : "Failed to create customer";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
