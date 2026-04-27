import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { patchPipelineProject } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    dashboard_visible: z.boolean().optional(),
    /** Pass `null` to un-archive, an ISO string to archive (or `true` to stamp now). */
    archived_at: z
      .union([z.string().datetime().nullable(), z.literal(true)])
      .optional(),
    status: z.enum(["pending", "active", "done"]).optional(),
    next_action: z.string().max(160).nullable().optional(),
    install_progress: z.number().min(0).max(100).optional(),
    capacity_kw: z.string().max(40).optional(),
    official_name: z.string().max(160).optional(),
    detail: z.string().max(240).optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Empty patch" });

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    }
    const body = await req.json();
    const parsed = patchSchema.parse(body);

    /**
     * Convenience: clients can pass `archived_at: true` to mean "archive now".
     * The DB stores the ISO timestamp so future tooling can sort by archive
     * recency.
     */
    const archivedAt =
      parsed.archived_at === true
        ? new Date().toISOString()
        : parsed.archived_at;

    const row = await patchPipelineProject(id, {
      dashboard_visible: parsed.dashboard_visible,
      archived_at: archivedAt,
      status: parsed.status,
      next_action: parsed.next_action,
      install_progress: parsed.install_progress,
      capacity_kw: parsed.capacity_kw,
      official_name: parsed.official_name,
      detail: parsed.detail
    });
    if (!row) {
      return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    }
    return NextResponse.json(
      { ok: true, data: row },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
        : error instanceof Error
          ? error.message
          : "Patch failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
