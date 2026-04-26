import { NextRequest, NextResponse } from "next/server";

import { listDiscomsForState } from "@/lib/supabase-discoms";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state")?.trim() ?? "";
  if (!state) {
    return NextResponse.json({ ok: true, data: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const data = await listDiscomsForState(state);
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "DISCOM list failed";
    return NextResponse.json({ ok: false, error: message, data: [] }, { status: 500 });
  }
}
