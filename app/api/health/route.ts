import { NextResponse } from "next/server";
import { getStates } from "@/lib/supabase";

export async function GET() {
  try {
    const states = await getStates();
    return NextResponse.json({ ok: true, supabase: true, statesLoaded: states.length });
  } catch {
    return NextResponse.json({ ok: true, supabase: false, statesLoaded: 0 });
  }
}
