import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LEAD_STATUS_KEYS } from "@/lib/lead-status";
import { bumpLeadStatus, supabase, resolveLeadsTable } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    status: z.enum(LEAD_STATUS_KEYS).optional(),
    name: z.string().min(1).max(160).optional(),
    city: z.string().min(1).max(160).optional(),
    state: z.string().max(120).optional(),
    discom: z.string().max(160).optional(),
    email: z.string().email().max(160).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    monthly_bill: z.number().nonnegative().optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Empty patch" });

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });

    const body = await req.json();
    const patch = patchSchema.parse(body);

    /**
     * Status transitions go through `bumpLeadStatus` so `last_touched_at` is
     * stamped consistently with the proposal-sent auto-bump path.
     */
    if (patch.status && Object.keys(patch).length === 1) {
      const updated = await bumpLeadStatus(id, patch.status);
      if (!updated) {
        return NextResponse.json({ ok: false, error: "lead_not_found_or_db_unavailable" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, data: updated });
    }

    /** Generic field patch (name / city / etc.) — also bumps last_touched_at. */
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    }
    const leadsTable = await resolveLeadsTable();
    if (!leadsTable) {
      return NextResponse.json({ ok: false, error: "leads_table_missing" }, { status: 500 });
    }
    const updatePayload: Record<string, unknown> = {
      ...patch,
      last_touched_at: new Date().toISOString()
    };
    const primary = await supabase
      .from(leadsTable)
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();
    if (primary.error) {
      /* Retry without last_touched_at for envs where 012 has not yet run. */
      const { last_touched_at: _drop, ...fallback } = updatePayload;
      void _drop;
      const retry = await supabase
        .from(leadsTable)
        .update(fallback)
        .eq("id", id)
        .select("*")
        .single();
      if (retry.error) {
        return NextResponse.json({ ok: false, error: retry.error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, data: retry.data });
    }
    return NextResponse.json({ ok: true, data: primary.data });
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
