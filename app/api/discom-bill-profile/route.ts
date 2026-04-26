import { NextRequest, NextResponse } from "next/server";
import { readDiscomBillProfile } from "@/lib/discom-bill-profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state")?.trim() ?? "";
  const discom = req.nextUrl.searchParams.get("discom")?.trim() ?? "";
  if (!state || !discom) {
    return NextResponse.json({ ok: true, data: null }, { headers: { "Cache-Control": "no-store" } });
  }
  const profile = await readDiscomBillProfile(state, discom);
  return NextResponse.json({ ok: true, data: profile }, { headers: { "Cache-Control": "no-store" } });
}
