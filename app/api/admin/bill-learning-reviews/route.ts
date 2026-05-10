import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequestAllowed, isSuperAdminRequestAllowed } from "@/lib/admin-access";
import { listBillLearningReviews, reviewBillLearningReview, type BillLearningReviewStatus } from "@/lib/bill-learning-reviews";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statusParam = z.enum(["pending", "approved", "rejected", "all"]).optional().default("pending");

const patchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reviewedBy: z.string().max(120).optional().nullable(),
  reviewNote: z.string().max(1000).optional().nullable()
});

export async function GET(req: NextRequest) {
  if (!(await isAdminRequestAllowed(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized admin API request." }, { status: 401 });
  }
  const status = statusParam.safeParse(req.nextUrl.searchParams.get("status") ?? undefined);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "80");
  const st: BillLearningReviewStatus | "all" = status.success ? status.data : "pending";
  const res = await listBillLearningReviews({
    status: st,
    limit: Number.isFinite(limit) ? limit : 80
  });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error, data: [] }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: res.data }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest) {
  if (!(await isSuperAdminRequestAllowed(req))) {
    return NextResponse.json(
      { ok: false, error: "Super Admin approval required (role super_admin / SUPER_ADMIN_USER_IDS)." },
      { status: 403 }
    );
  }
  try {
    const body = patchSchema.parse(await req.json());
    const out = await reviewBillLearningReview({
      id: body.id,
      action: body.action,
      reviewedBy: body.reviewedBy,
      reviewNote: body.reviewNote
    });
    if (!out.ok) {
      return NextResponse.json({ ok: false, error: out.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: out.row }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message =
      e instanceof z.ZodError ? e.issues.map((i) => i.message).join(", ") : e instanceof Error ? e.message : "Invalid body";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
