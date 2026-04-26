import { NextResponse } from "next/server";
import { getDashboardStatsFast } from "@/lib/supabase-stats";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;
/** Route handlers have no default timeout; slowness was from sequential Supabase probes + wide selects. */
export const maxDuration = 30;

export async function GET() {
  try {
    const stats = await getDashboardStatsFast();
    return NextResponse.json({
      ok: true,
      data: stats,
      message: "Counts resolved from customers, proposals, projects with active recent projects."
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard stats";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
