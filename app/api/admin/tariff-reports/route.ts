import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequestAllowed } from "@/lib/admin-access";
import { listTariffReports, reviewTariffReport, type TariffReportStatus } from "@/lib/rate-change-reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedStatus = new Set<TariffReportStatus | "all">([
  "all",
  "pending_admin_approval",
  "verified",
  "ignored",
  "false_positive"
]);

const reviewSchema = z.object({
  id: z.string().min(3),
  table: z.string().min(3),
  action: z.enum(["approve", "ignore", "false_positive"]).optional().default("approve"),
  reviewedBy: z.string().max(120).optional().nullable(),
  reviewNote: z.string().max(1000).optional().nullable()
});

export async function GET(req: NextRequest) {
  if (!(await isAdminRequestAllowed(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized admin API request." }, { status: 401 });
  }
  const statusRaw = (req.nextUrl.searchParams.get("status")?.trim() ?? "all") as TariffReportStatus | "all";
  const status: TariffReportStatus | "all" = allowedStatus.has(statusRaw) ? statusRaw : "all";
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "100");
  const result = await listTariffReports(status, Number.isFinite(limit) ? limit : 100);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error ?? "Load failed", data: [] }, { status: 500 });
  return NextResponse.json({ ok: true, data: result.data }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequestAllowed(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized admin API request." }, { status: 401 });
  }
  try {
    const body = reviewSchema.parse(await req.json());
    const approved = await reviewTariffReport({
      id: body.id,
      table: body.table,
      action: body.action,
      reviewNote: body.reviewNote,
      reviewedBy: body.reviewedBy
    });
    if (!approved.ok) {
      return NextResponse.json({ ok: false, error: approved.error ?? "Approve failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: approved.row }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message =
      e instanceof z.ZodError ? e.issues.map((i) => i.message).join(", ") : e instanceof Error ? e.message : "Approve failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
