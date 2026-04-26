import { NextRequest, NextResponse } from "next/server";
import { listPipelineProjects, upsertPipelineProject } from "@/lib/supabase";
import { z } from "zod";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  lead_id: z.string().uuid(),
  official_name: z.string().max(300).optional().nullable(),
  capacity_kw: z.string().max(80).optional().nullable(),
  detail: z.string().max(500).optional().nullable(),
  status: z.string().max(40).optional(),
  install_progress: z.number().int().min(0).max(100).optional(),
  next_action: z.string().max(200).optional().nullable()
});

export async function GET() {
  try {
    const data = await listPipelineProjects();
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Pipeline load failed";
    return NextResponse.json({ ok: false, error: message, data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = postSchema.parse(body);
    const row = await upsertPipelineProject({
      lead_id: parsed.lead_id,
      official_name: parsed.official_name ?? undefined,
      capacity_kw: parsed.capacity_kw ?? undefined,
      detail: parsed.detail ?? undefined,
      status: parsed.status,
      install_progress: parsed.install_progress,
      next_action: parsed.next_action
    });
    return NextResponse.json({ ok: true, data: row }, { status: 200 });
  } catch (e) {
    const message =
      e instanceof z.ZodError
        ? e.issues.map((i) => i.message).join(", ")
        : e instanceof Error
          ? e.message
          : "Save failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
