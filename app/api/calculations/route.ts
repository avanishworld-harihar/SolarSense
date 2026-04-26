import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLatestPersistenceSnapshot, saveCalculationRecord } from "@/lib/supabase-persistence";

export const dynamic = "force-dynamic";

const monthKeys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;
const monthlyUnitsSchema = z.object(
  Object.fromEntries(monthKeys.map((k) => [k, z.number().min(0).max(200000)])) as Record<(typeof monthKeys)[number], z.ZodNumber>
);

const resultSchema = z.object({
  annualUnits: z.number(),
  solarKw: z.number(),
  panels: z.number(),
  annualGeneration: z.number(),
  currentMonthlyBill: z.number(),
  newMonthlyBill: z.number(),
  monthlySavings: z.number(),
  annualSavings: z.number(),
  grossCost: z.number(),
  centralSubsidy: z.number(),
  netCost: z.number(),
  paybackYears: z.number(),
  paybackDisplay: z.string(),
  savings25yr: z.number(),
  profit25yr: z.number()
});

const postSchema = z.object({
  clientRef: z.string().min(8).max(120),
  leadId: z.string().max(80).optional().nullable(),
  monthlyUnits: monthlyUnitsSchema,
  result: resultSchema,
  stateForSizing: z.string().max(120).optional().nullable(),
  discom: z.string().max(120).optional().nullable(),
  tariffLabel: z.string().max(240).optional().nullable(),
  manualSnapshot: z.record(z.string(), z.string()).optional().nullable(),
  latestBill: z.record(z.string(), z.unknown()).optional().nullable(),
  previousBill: z.record(z.string(), z.unknown()).optional().nullable()
});

export async function GET(req: NextRequest) {
  const clientRef = req.nextUrl.searchParams.get("clientRef")?.trim() ?? "";
  const leadId = req.nextUrl.searchParams.get("leadId")?.trim() ?? "";
  if (!clientRef) {
    return NextResponse.json({ ok: false, error: "clientRef required" }, { status: 400 });
  }
  try {
    const data = await getLatestPersistenceSnapshot(clientRef, leadId || undefined);
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Load failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = postSchema.parse(body);
    const ok = await saveCalculationRecord({
      clientRef: parsed.clientRef,
      leadId: parsed.leadId ?? null,
      monthlyUnits: parsed.monthlyUnits,
      result: parsed.result,
      stateForSizing: parsed.stateForSizing ?? null,
      discom: parsed.discom ?? null,
      tariffLabel: parsed.tariffLabel ?? null,
      manualSnapshot: parsed.manualSnapshot ?? null,
      latestBill: (parsed.latestBill as Record<string, unknown> | null) ?? null,
      previousBill: (parsed.previousBill as Record<string, unknown> | null) ?? null
    });
    return NextResponse.json({ ok, saved: ok }, { status: ok ? 200 : 202 });
  } catch (e) {
    const message =
      e instanceof z.ZodError ? e.issues.map((i) => i.message).join(", ") : e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
