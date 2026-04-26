import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchMpAuditOverridesByRef } from "@/lib/mp-bill-audit-fetch";
import { summarizeProposalDeck, type PremiumProposalPptInput } from "@/lib/proposal-ppt";
import { createProposal } from "@/lib/proposals-store";
import { proposalExtrasShape } from "@/lib/proposal-extras-schema";
import type { MonthlyUnits } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const monthsSchema = z.object({
  jan: z.number(), feb: z.number(), mar: z.number(), apr: z.number(),
  may: z.number(), jun: z.number(), jul: z.number(), aug: z.number(),
  sep: z.number(), oct: z.number(), nov: z.number(), dec: z.number()
});

const monthBillActualsSchema = z.object({
  jan: z.number().min(0).optional(), feb: z.number().min(0).optional(),
  mar: z.number().min(0).optional(), apr: z.number().min(0).optional(),
  may: z.number().min(0).optional(), jun: z.number().min(0).optional(),
  jul: z.number().min(0).optional(), aug: z.number().min(0).optional(),
  sep: z.number().min(0).optional(), oct: z.number().min(0).optional(),
  nov: z.number().min(0).optional(), dec: z.number().min(0).optional()
}).optional();

const bodySchema = z.object({
  customerName: z.string().min(1).max(120),
  location: z.string().max(160).default(""),
  systemKw: z.number().min(0).max(200),
  yearlyBill: z.number().min(0),
  afterSolar: z.number().min(0),
  saving: z.number().min(0),
  paybackYears: z.number().min(0).max(50),
  monthlyUnits: monthsSchema,
  state: z.string().max(100).optional(),
  discom: z.string().max(160).optional(),
  connectionType: z.string().max(120).optional(),
  tariffCategory: z.string().max(120).optional(),
  connectedLoadKw: z.number().min(0).max(500).optional(),
  contractDemandKva: z.number().min(0).max(2000).optional(),
  areaProfile: z.enum(["urban", "rural"]).optional(),
  billMonth: z.string().max(40).optional(),
  currentMonthBillAmountInr: z.number().min(0).max(10000000).nullable().optional(),
  monthlyBillActuals: monthBillActualsSchema,
  agjyClaimed: z.boolean().optional(),
  clientRef: z.string().max(120).optional(),
  leadId: z.string().max(120).optional(),
  consumerId: z.string().max(120).optional(),
  useMpAudits: z.boolean().optional(),
  grossSystemCostInr: z.number().min(0).max(50000000).optional(),
  pmSuryaGharSubsidyInr: z.number().min(0).max(500000).optional(),
  netCostInr: z.number().min(0).max(50000000).optional(),
  panelBrand: z.enum(["Adani", "Waaree", "JSW", "Tata", "Vikram", "RenewSys"]).optional(),
  installerName: z.string().max(120).optional(),
  installerTagline: z.string().max(160).optional(),
  installerContact: z.string().max(160).optional(),
  ...proposalExtrasShape
});

function looksLikeMp(state?: string, discom?: string): boolean {
  return /madhya pradesh|mppkv|mppgvv|mpmkvv|mppakvv|mpcz|mpez|mpwz/i.test(`${state ?? ""} ${discom ?? ""}`);
}

export async function POST(req: NextRequest) {
  try {
    const payload = bodySchema.parse(await req.json());

    // Auto-pull MP audits when applicable.
    let auditOverrides: PremiumProposalPptInput["monthlyAuditOverrides"];
    const wantsMpAudits = payload.useMpAudits !== false && looksLikeMp(payload.state, payload.discom);
    if (wantsMpAudits && (payload.clientRef || payload.leadId || payload.consumerId)) {
      try {
        const fetched = await fetchMpAuditOverridesByRef({
          clientRef: payload.clientRef ?? null,
          leadId: payload.leadId ?? null,
          consumerId: payload.consumerId ?? null,
          withinDays: 540
        });
        auditOverrides = fetched.overrides;
      } catch (e) {
        console.warn("[proposals POST] mp_bill_audits fetch failed:", e);
      }
    }

    const pptInput: PremiumProposalPptInput = {
      ...payload,
      monthlyUnits: payload.monthlyUnits as MonthlyUnits,
      monthlyAuditOverrides: auditOverrides
    };
    const summary = summarizeProposalDeck(pptInput);

    const created = await createProposal({
      pptInput,
      summary,
      clientRef: payload.clientRef ?? null,
      leadId: payload.leadId ?? null,
      consumerId: payload.consumerId ?? null
    });

    if (!created) {
      // Supabase unavailable — return ephemeral summary so the dashboard can
      // still preview, just no shareable link.
      return NextResponse.json(
        { ok: true, persisted: false, summary, id: null, shareUrl: null },
        { status: 200 }
      );
    }

    const origin = req.headers.get("origin") || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const shareUrl = `${origin}/proposal/${created.id}`;

    return NextResponse.json(
      {
        ok: true,
        persisted: true,
        id: created.id,
        shareToken: created.share_token,
        customerName: created.customer_name,
        generatedAt: created.generated_at,
        shareUrl,
        summary
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
      : error instanceof Error ? error.message : "Could not create proposal";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
