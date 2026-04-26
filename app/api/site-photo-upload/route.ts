import { NextRequest, NextResponse } from "next/server";
import { uploadSitePhoto } from "@/lib/site-photo-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sol.52 — multi-image upload endpoint for past-installation photos.
 *
 *   POST  /api/site-photo-upload
 *   form-data: files[] (1..6 images)
 *
 * Returns: { ok, urls: string[] } when at least one upload succeeds.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const candidates: File[] = [];

    // Accept either a single `file` field (logo-style) or many `files[]`.
    const single = form.get("file");
    if (single instanceof File) candidates.push(single);
    for (const v of form.getAll("files")) {
      if (v instanceof File) candidates.push(v);
    }
    for (const v of form.getAll("files[]")) {
      if (v instanceof File) candidates.push(v);
    }

    if (candidates.length === 0) {
      return NextResponse.json({ ok: false, error: "At least one image is required." }, { status: 400 });
    }
    if (candidates.length > 6) {
      return NextResponse.json({ ok: false, error: "Up to 6 photos at a time." }, { status: 400 });
    }

    const urls: string[] = [];
    const errors: string[] = [];

    for (const file of candidates) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const out = await uploadSitePhoto(bytes, file.type || "image/jpeg");
      if (out.ok && out.url) urls.push(out.url);
      else errors.push(out.error ?? "upload failed");
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { ok: false, error: errors.join(" · ") || "All uploads failed." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, urls, errors: errors.length > 0 ? errors : undefined },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
