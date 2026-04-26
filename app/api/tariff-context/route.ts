import { NextRequest, NextResponse } from "next/server";
import { loadTariffContextFromSupabase } from "@/lib/supabase-tariff";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state")?.trim() ?? "";
  const discom = req.nextUrl.searchParams.get("discom")?.trim() ?? "";
  try {
    const ctx = await loadTariffContextFromSupabase(state, discom || "MPPKVVCL");
    return NextResponse.json({ ok: true, data: ctx }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tariff load failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
