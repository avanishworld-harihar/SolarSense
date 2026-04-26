/**
 * Sol.52 — project-level BOM override CRUD.
 *
 * Workflow:
 *   1. Installer creates a quick "rough" proposal at the customer's home —
 *      uses the default Bill of Materials baked into `lib/bom-blueprint.ts`.
 *   2. After visiting the site, the installer refines the BOM (final brand /
 *      spec / warranty per slot) and PATCHes those picks here. The values are
 *      stored on the `projects` row (`bom_overrides` JSONB) and merged on top
 *      of the default BOM at proposal-render time (see `lib/proposal-ppt.ts`).
 *   3. Lock-in: PATCH with `lock=true` stamps `bom_locked_at`, marking the
 *      project as "ready for the final proposal".
 *
 * Security: the projects table is per-installer, so we route through the
 * service-role admin client. This route is intended for authenticated
 * dashboard sessions — pair with NextAuth/Supabase auth in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { bomOverridesSchema } from "@/lib/proposal-extras-schema";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  bomOverrides: bomOverridesSchema,
  /** When true, stamp bom_locked_at = now() (final BOM lock). */
  lock: z.boolean().optional(),
  /** When true, clear the lock (allow further edits). */
  unlock: z.boolean().optional()
});

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "supabase_admin_unavailable" }, { status: 503 });

  const { data, error } = await admin
    .from("projects")
    .select("id, bom_overrides, bom_locked_at, capacity_kw, official_name, status")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (/bom_overrides|bom_locked_at/.test(error.message)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "BOM override columns are missing. Run migration `supabase/migrations/011_projects_bom_overrides.sql`."
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());

    const admin = createSupabaseAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "supabase_admin_unavailable" }, { status: 503 });

    const update: Record<string, unknown> = {};
    if (body.bomOverrides !== undefined) update.bom_overrides = body.bomOverrides;
    if (body.lock) update.bom_locked_at = new Date().toISOString();
    if (body.unlock) update.bom_locked_at = null;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, error: "no_fields_to_update" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("projects")
      .update(update)
      .eq("id", id)
      .select("id, bom_overrides, bom_locked_at")
      .maybeSingle();

    if (error) {
      // Friendly handling for missing migration (010 / 011).
      if (/bom_overrides|bom_locked_at/.test(error.message)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "BOM override columns are missing. Run the migration `supabase/migrations/011_projects_bom_overrides.sql`."
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const message =
      e instanceof z.ZodError ? e.issues.map((i) => i.message).join(", ") : e instanceof Error ? e.message : "patch_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
