import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, isAdminEnabled } from "@/lib/admin-access";

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

function isAdminApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/admin");
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (!isAdminPath(pathname) && !isAdminApiPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login" || pathname === "/api/admin/session") {
    return NextResponse.next();
  }

  if (!isAdminEnabled()) {
    if (isAdminApiPath(pathname)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Admin access not configured. Set SUPABASE_SERVICE_ROLE_KEY and RBAC user role."
        },
        { status: 503 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", `${pathname}${search}`);
    url.searchParams.set("reason", "not_configured");
    return NextResponse.redirect(url);
  }

  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (cookieToken) {
    return NextResponse.next();
  }

  if (isAdminApiPath(pathname)) {
    return NextResponse.json({ ok: false, error: "Unauthorized admin API request." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
