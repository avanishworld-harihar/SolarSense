import { NextRequest, NextResponse } from "next/server";
import { createCustomer, listCustomers } from "@/lib/supabase";
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
    phone
  };
}

const customerSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  discom: z.string().min(2),
  monthly_bill: z.number().nonnegative(),
  status: z.string().optional(),
  phone: z.string().optional()
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
    const customer = await createCustomer(payload);
    return NextResponse.json({ ok: true, data: customer }, { status: 201 });
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
