import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  adminCookieConfig,
  buildAdminCookieValue,
  isAdminEnabled,
  readAdminSession,
  resolveAdminIdentity
} from "@/lib/admin-access";
import { listTariffReports } from "@/lib/rate-change-reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  userId: z.string().max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable()
});

export async function POST(req: NextRequest) {
  try {
    const { userId, phone } = loginSchema.parse(await req.json());
    if (!(userId?.trim() || phone?.trim())) {
      return NextResponse.json({ ok: false, error: "Provide userId or phone for admin validation." }, { status: 400 });
    }
    if (!isAdminEnabled()) {
      return NextResponse.json(
        { ok: false, error: "Admin access is not configured. Set SUPABASE_SERVICE_ROLE_KEY." },
        { status: 503 }
      );
    }

    const adminUser = await resolveAdminIdentity({ userId: userId ?? null, phone: phone ?? null });
    if (!adminUser) {
      return NextResponse.json({ ok: false, error: "Admin role not found for this user identity." }, { status: 403 });
    }

    const identifier = adminUser.phone || adminUser.id || "";
    const cookieValue = buildAdminCookieValue({
      identifier,
      checkedAt: new Date().toISOString()
    });

    const pending = await listTariffReports("pending_admin_approval", 150);
    const pendingCount = pending.ok ? pending.data.length : 0;

    const res = NextResponse.json({
      ok: true,
      data: {
        isAdmin: true,
        admin: adminUser,
        pendingTariffReports: pendingCount
      }
    });
    const cookie = adminCookieConfig();
    res.cookies.set(cookie.name, cookieValue, cookie);
    return res;
  } catch (e) {
    const message = e instanceof z.ZodError ? e.issues.map((i) => i.message).join(", ") : "Login failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  const cookie = adminCookieConfig();
  res.cookies.set(cookie.name, "", { ...cookie, maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Admin access is not configured. Set SUPABASE_SERVICE_ROLE_KEY.", data: { isAdmin: false } },
      { status: 503 }
    );
  }

  const session = readAdminSession(req);
  if (!session) {
    return NextResponse.json({ ok: true, data: { isAdmin: false } });
  }

  const isPhoneLike = /^[+\d]{8,}$/.test(session.identifier);
  const adminUser = await resolveAdminIdentity({
    userId: isPhoneLike ? null : session.identifier,
    phone: isPhoneLike ? session.identifier : null
  });
  if (!adminUser) {
    return NextResponse.json({ ok: true, data: { isAdmin: false } });
  }

  const pending = await listTariffReports("pending_admin_approval", 150);
  const pendingCount = pending.ok ? pending.data.length : 0;
  return NextResponse.json({
    ok: true,
    data: {
      isAdmin: true,
      admin: adminUser,
      pendingTariffReports: pendingCount
    }
  });
}
