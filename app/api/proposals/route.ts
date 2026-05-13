import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchMpAuditOverridesByRef } from "@/lib/mp-bill-audit-fetch";
import { defaultProposalPricingFromDeck, mergeProposalPricingIntoPptInput } from "@/lib/proposal-pricing-merge";
import { ensureProposalPricingRow, getProposalPricingByProposalId } from "@/lib/proposal-pricing-store";
import { persistProposalDeckAfterPricingChange } from "@/lib/proposal-pricing-sync";
import { summarizeProposalDeck, type PremiumProposalPptInput } from "@/lib/proposal-ppt";
import { createProposal, listRecentProposals } from "@/lib/proposals-store";
import { proposalExtrasShape } from "@/lib/proposal-extras-schema";
import { bumpLeadStatus, upsertPipelineProject } from "@/lib/supabase";
import type { MonthlyUnits } from "@/lib/types";

const SITE_SURVEY_NEXT_ACTION = "Site survey pending";

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

const monthlyAuditOverrideEntry = z.object({
  netPayableInr: z.number().min(0),
  energyInr: z.number().min(0).optional(),
  fixedInr: z.number().min(0).optional(),
  fppasInr: z.number().optional(),
  electricityDutyInr: z.number().optional(),
  units: z.number().min(0).optional(),
  pfSurchargeInr: z.number().min(0).optional()
});

const monthlyAuditOverridesSchema = z.object({
  jan: monthlyAuditOverrideEntry.optional(), feb: monthlyAuditOverrideEntry.optional(),
  mar: monthlyAuditOverrideEntry.optional(), apr: monthlyAuditOverrideEntry.optional(),
  may: monthlyAuditOverrideEntry.optional(), jun: monthlyAuditOverrideEntry.optional(),
  jul: monthlyAuditOverrideEntry.optional(), aug: monthlyAuditOverrideEntry.optional(),
  sep: monthlyAuditOverrideEntry.optional(), oct: monthlyAuditOverrideEntry.optional(),
  nov: monthlyAuditOverrideEntry.optional(), dec: monthlyAuditOverrideEntry.optional()
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
  purposeOfSupply: z.string().max(200).optional(),
  contractDemandKva: z.number().min(0).max(2000).optional(),
  billEnergyChargesInr: z.number().min(0).max(50000000).optional(),
  billElectricityDutyInr: z.number().min(-50000000).max(50000000).optional(),
  billFppasInr: z.number().min(-50000000).max(50000000).optional(),
  billFixedChargeInr: z.number().min(0).max(50000000).optional(),
  referenceBillUnits: z.number().min(0).max(2_000_000).optional(),
  areaProfile: z.enum(["urban", "rural"]).optional(),
  billMonth: z.string().max(40).optional(),
  currentMonthBillAmountInr: z.number().min(0).max(10000000).nullable().optional(),
  monthlyBillActuals: monthBillActualsSchema,
  monthlyAuditOverrides: monthlyAuditOverridesSchema,
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

export async function GET() {
  try {
    const data = await listRecentProposals(60);
    return NextResponse.json({ ok: true, data }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json({ ok: false, error: message, data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = bodySchema.parse(await req.json());

    // Auto-pull MP audits when applicable.
    let auditOverrides: PremiumProposalPptInput["monthlyAuditOverrides"] = payload.monthlyAuditOverrides;
    const wantsMpAudits = payload.useMpAudits !== false && looksLikeMp(payload.state, payload.discom);
    if (wantsMpAudits && (payload.clientRef || payload.leadId || payload.consumerId)) {
      try {
        const fetched = await fetchMpAuditOverridesByRef({
          clientRef: payload.clientRef ?? null,
          leadId: payload.leadId ?? null,
          consumerId: payload.consumerId ?? null,
          withinDays: 540
        });
        // Caller-supplied overrides come from currently uploaded PDFs and are fresher than DB rows.
        auditOverrides = { ...fetched.overrides, ...(auditOverrides ?? {}) };
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

    let responseSummary = summary;
    try {
      await ensureProposalPricingRow(defaultProposalPricingFromDeck(created.id, pptInput, summary));
      await persistProposalDeckAfterPricingChange(created.id);
      const pr = await getProposalPricingByProposalId(created.id);
      if (pr) {
        responseSummary = summarizeProposalDeck(mergeProposalPricingIntoPptInput(pptInput, pr));
      }
    } catch (err) {
      console.warn("[proposals POST] proposal_pricing seed / sync:", err);
    }

    /**
     * Server-owned auto-conversion (Sol.52 spec): when a web proposal is
     * generated for a real CRM lead, the lead automatically transitions to
     * `proposal-sent` and a Project pipeline card is created with
     * `next_action = "Site survey pending"`. No client mutation needed.
     *
     * Best-effort: a failure here must NOT block returning the proposal to
     * the caller (the share link is the user-facing artifact).
     */
    let projectId: string | null = null;
    if (payload.leadId) {
      const detail = payload.location?.trim() || null;
      try {
        const project = await upsertPipelineProject({
          lead_id: payload.leadId,
          official_name: payload.customerName,
          capacity_kw: `${payload.systemKw} kW`,
          detail: detail ?? undefined,
          status: "pending",
          install_progress: 10,
          next_action: SITE_SURVEY_NEXT_ACTION
        });
        if (project && typeof project["id"] === "string") {
          projectId = project["id"] as string;
        }
      } catch (err) {
        console.warn("[proposals POST] pipeline upsert failed:", err);
      }
      try {
        await bumpLeadStatus(payload.leadId, "proposal-sent");
      } catch (err) {
        console.warn("[proposals POST] bumpLeadStatus failed:", err);
      }
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
        summary: responseSummary,
        projectId,
        leadStatus: payload.leadId ? "proposal-sent" : null
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
