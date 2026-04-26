import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readLatestRateChangeStatus, saveRateChangeReport } from "@/lib/rate-change-reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  installerName: z.string().min(1).max(200),
  installerState: z.string().min(1).max(200),
  activeTariff: z.string().min(1).max(240),
  source: z.enum(["more_manual", "ai_scan"]).optional(),
  detectedRates: z.array(z.number()).optional(),
  databaseRates: z.array(z.number()).optional(),
  note: z.string().max(2000).optional().nullable()
});

export async function GET(req: NextRequest) {
  const installerState = req.nextUrl.searchParams.get("installerState")?.trim() ?? "";
  const activeTariff = req.nextUrl.searchParams.get("activeTariff")?.trim() ?? "";
  if (!installerState || !activeTariff) {
    return NextResponse.json({ ok: false, error: "installerState and activeTariff are required." }, { status: 400 });
  }
  const status = await readLatestRateChangeStatus({ installerState, activeTariff });
  return NextResponse.json({ ok: status.ok, data: status }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const result = await saveRateChangeReport({
      installerName: body.installerName,
      installerState: body.installerState,
      activeTariff: body.activeTariff,
      source: body.source,
      detectedRates: body.detectedRates,
      databaseRates: body.databaseRates,
      status: "pending_admin_approval",
      note: body.note
    });
    if (!result.ok) {
      const status = result.code === "config" ? 503 : 500;
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }
    return NextResponse.json(
      { ok: true, id: result.id, table: result.table },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const message =
      e instanceof z.ZodError ? e.issues.map((i) => i.message).join(", ") : e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
