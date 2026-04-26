import { NextRequest, NextResponse } from "next/server";
import { uploadCompanyLogo } from "@/lib/company-logo-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "File is required." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await uploadCompanyLogo(bytes, file.type || "image/png");
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? "Upload failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, url: result.url, path: result.path }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
