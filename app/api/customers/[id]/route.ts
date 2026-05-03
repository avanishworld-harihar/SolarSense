import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { mapCustomerRow } from "@/lib/customers-map";
import { LEAD_STATUS_KEYS } from "@/lib/lead-status";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { bumpLeadStatus, supabase, resolveLeadsTable } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/** PostgREST / Postgres: column not present on this deploy (migrations not run). */
function missingColumnFromPgError(message: string): string | null {
  const m = /Could not find the '([^']+)' column/i.exec(message);
  return m?.[1] ?? null;
}

/**
 * Update `leads` with optional v2 columns — drop any key PostgREST rejects so
 * edit-lead works on older DBs (e.g. before `consumer_id` / `survey_status`).
 */
async function updateLeadAdaptive(
  db: SupabaseClient,
  table: string,
  leadId: string,
  payload: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  let attempt = { ...payload };
  for (let guard = 0; guard < 40 && Object.keys(attempt).length > 0; guard++) {
    const { data, error } = await db.from(table).update(attempt).eq("id", leadId).select("*").single();
    if (!error && data) {
      return { data: data as Record<string, unknown>, error: null };
    }
    const msg = error?.message ?? "";
    const miss = missingColumnFromPgError(msg);
    if (miss && miss in attempt) {
      delete attempt[miss];
      continue;
    }
    if (/last_touched_at/i.test(msg) && "last_touched_at" in attempt) {
      delete attempt.last_touched_at;
      continue;
    }
    return { data: null, error: msg || "Lead update failed" };
  }
  return { data: null, error: "Lead update exhausted retries" };
}

const patchSchema = z
  .object({
    status: z.enum(LEAD_STATUS_KEYS).optional(),
    name: z.string().min(1).max(160).optional(),
    city: z.string().min(1).max(160).optional(),
    state: z.string().max(120).optional(),
    discom: z.string().max(160).optional(),
    email: z.string().email().max(160).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    monthly_bill: z.number().nonnegative().optional(),
    consumer_id: z.string().max(160).optional().nullable(),
    survey_status: z.string().max(40).optional().nullable()
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
      return NextResponse.json({ ok: true, data: mapCustomerRow(updated) });
    }

    /** Generic field patch (name / city / etc.) — also bumps last_touched_at. */
    const db = createSupabaseAdmin() ?? supabase;
    if (!db) {
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
    const { data: updatedRow, error: updateErr } = await updateLeadAdaptive(db, leadsTable, id, updatePayload);
    if (updateErr || !updatedRow) {
      return NextResponse.json({ ok: false, error: updateErr ?? "Lead update failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: mapCustomerRow(updatedRow) });
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

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    }
    const leadsTable = await resolveLeadsTable();
    if (!leadsTable) {
      return NextResponse.json({ ok: false, error: "leads_table_missing" }, { status: 500 });
    }
    const { data, error } = await supabase.from(leadsTable).delete().eq("id", id).select("id").maybeSingle();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "lead_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
