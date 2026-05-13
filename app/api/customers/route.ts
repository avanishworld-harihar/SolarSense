import { NextRequest, NextResponse } from "next/server";
import { mapCustomerRow } from "@/lib/customers-map";
import { listCustomers, listPipelineProjects, mapLeadIdsToLatestProposalIds } from "@/lib/supabase";
import { processInboundLead } from "@/lib/inbound-leads";
import type { CustomerLead } from "@/lib/types";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  discom: z.string().min(2),
  monthly_bill: z.number().nonnegative(),
  status: z.string().optional(),
  phone: z.string().optional(),
  state: z.string().optional(),
  email: z.string().email().optional(),
  consumer_id: z.string().max(160).optional(),
  survey_status: z.string().max(40).optional()
});

export async function GET() {
  try {
    const raw = await listCustomers();
    const customers = (raw as Record<string, unknown>[]).map(mapCustomerRow);
    const pipeline = await listPipelineProjects();
    const stageByLeadId = new Map<string, "in-pipeline" | "active-project">();
    for (const p of pipeline) {
      if (!p.lead_id) continue;
      const status = String(p.status ?? "").toLowerCase();
      const stage = status.includes("done") || status.includes("active") || status.includes("install")
        ? "active-project"
        : "in-pipeline";
      stageByLeadId.set(p.lead_id, stage);
    }
    const proposalByLead = await mapLeadIdsToLatestProposalIds(customers.map((c) => c.id));
    const decorated = customers.map((c) => ({
      ...c,
      customer_stage: stageByLeadId.get(c.id) ?? "lead",
      primary_proposal_id: proposalByLead[c.id] ?? null
    }));
    return NextResponse.json({ ok: true, data: decorated });
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
      consumer_id: payload.consumer_id?.trim() || null,
      survey_status: payload.survey_status?.trim().toLowerCase() || null,
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
