import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildPremiumProposalPptBuffer } from "@/lib/proposal-ppt";
import { fetchMpAuditOverridesByRef } from "@/lib/mp-bill-audit-fetch";
import { proposalExtrasShape } from "@/lib/proposal-extras-schema";
import type { MonthlyUnits } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const monthsSchema = z.object({
  jan: z.number(),
  feb: z.number(),
  mar: z.number(),
  apr: z.number(),
  may: z.number(),
  jun: z.number(),
  jul: z.number(),
  aug: z.number(),
  sep: z.number(),
  oct: z.number(),
  nov: z.number(),
  dec: z.number()
});

const monthBillActualsSchema = z
  .object({
    jan: z.number().min(0).optional(),
    feb: z.number().min(0).optional(),
    mar: z.number().min(0).optional(),
    apr: z.number().min(0).optional(),
    may: z.number().min(0).optional(),
    jun: z.number().min(0).optional(),
    jul: z.number().min(0).optional(),
    aug: z.number().min(0).optional(),
    sep: z.number().min(0).optional(),
    oct: z.number().min(0).optional(),
    nov: z.number().min(0).optional(),
    dec: z.number().min(0).optional()
  })
  .optional();

const monthlyFppasPctSchema = z
  .object({
    jan: z.number().min(-1).max(1).optional(),
    feb: z.number().min(-1).max(1).optional(),
    mar: z.number().min(-1).max(1).optional(),
    apr: z.number().min(-1).max(1).optional(),
    may: z.number().min(-1).max(1).optional(),
    jun: z.number().min(-1).max(1).optional(),
    jul: z.number().min(-1).max(1).optional(),
    aug: z.number().min(-1).max(1).optional(),
    sep: z.number().min(-1).max(1).optional(),
    oct: z.number().min(-1).max(1).optional(),
    nov: z.number().min(-1).max(1).optional(),
    dec: z.number().min(-1).max(1).optional()
  })
  .optional();

const monthlyAuditOverrideEntry = z.object({
  netPayableInr: z.number().min(0),
  energyInr: z.number().min(0).optional(),
  fixedInr: z.number().min(0).optional(),
  fppasInr: z.number().optional(),
  electricityDutyInr: z.number().min(0).optional(),
  units: z.number().min(0).optional()
});

const monthlyAuditOverridesSchema = z
  .object({
    jan: monthlyAuditOverrideEntry.optional(),
    feb: monthlyAuditOverrideEntry.optional(),
    mar: monthlyAuditOverrideEntry.optional(),
    apr: monthlyAuditOverrideEntry.optional(),
    may: monthlyAuditOverrideEntry.optional(),
    jun: monthlyAuditOverrideEntry.optional(),
    jul: monthlyAuditOverrideEntry.optional(),
    aug: monthlyAuditOverrideEntry.optional(),
    sep: monthlyAuditOverrideEntry.optional(),
    oct: monthlyAuditOverrideEntry.optional(),
    nov: monthlyAuditOverrideEntry.optional(),
    dec: monthlyAuditOverrideEntry.optional()
  })
  .optional();

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
  billElectricityDutyInr: z.number().min(0).max(50000000).optional(),
  billFixedChargeInr: z.number().min(0).max(50000000).optional(),
  referenceBillUnits: z.number().min(0).max(2_000_000).optional(),
  areaProfile: z.enum(["urban", "rural"]).optional(),
  billMonth: z.string().max(40).optional(),
  currentMonthBillAmountInr: z.number().min(0).max(10000000).nullable().optional(),
  monthlyBillActuals: monthBillActualsSchema,
  monthlyAuditOverrides: monthlyAuditOverridesSchema,
  monthlyFppasPct: monthlyFppasPctSchema,
  agjyClaimed: z.boolean().optional(),
  /** When provided, the route auto-pulls latest mp_bill_audits rows. */
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

function safeName(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim();
  return cleaned.length > 0 ? cleaned : "customer";
}

function looksLikeMp(state?: string, discom?: string): boolean {
  return /madhya pradesh|mppkv|mppgvv|mpmkvv|mppakvv|mpcz|mpez|mpwz/i.test(`${state ?? ""} ${discom ?? ""}`);
}

export async function POST(req: NextRequest) {
  try {
    const payload = bodySchema.parse(await req.json());

    let auditOverrides = payload.monthlyAuditOverrides;
    let auditedMonths = 0;
    const wantsMpAudits = payload.useMpAudits !== false && looksLikeMp(payload.state, payload.discom);
    const hasRef = Boolean(payload.clientRef || payload.leadId || payload.consumerId);

    if (wantsMpAudits && hasRef) {
      try {
        const fetched = await fetchMpAuditOverridesByRef({
          clientRef: payload.clientRef ?? null,
          leadId: payload.leadId ?? null,
          consumerId: payload.consumerId ?? null,
          withinDays: 540
        });
        auditedMonths = Object.keys(fetched.overrides).length;
        // Caller-supplied overrides take precedence over DB-fetched ones.
        auditOverrides = { ...fetched.overrides, ...(auditOverrides ?? {}) };
      } catch (e) {
        console.warn("[proposal-ppt] mp_bill_audits fetch failed:", e);
      }
    }

    const buffer = await buildPremiumProposalPptBuffer({
      ...payload,
      monthlyUnits: payload.monthlyUnits as MonthlyUnits,
      monthlyAuditOverrides: auditOverrides
    });
    const fileName = `${safeName(payload.customerName)}-premium-proposal.pptx`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
        "X-Sol52-Engine": looksLikeMp(payload.state, payload.discom) ? "mp_2025_26" : "legacy",
        "X-Sol52-Audited-Months": String(auditedMonths)
      }
    });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues.map((i) => i.message).join(", ") : "Could not generate PPT";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
