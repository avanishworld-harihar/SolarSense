import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { saveVerifiedBillTraining } from "@/lib/verified-bills-training";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf"
]);

const bodySchema = z.object({
  billData: z.record(z.unknown()),
  base64Data: z.string().min(20, "File payload too small"),
  mimeType: z.string().min(3).max(120).optional(),
  monthlyUnits: z.record(z.string(), z.number()).optional(),
  notes: z.string().max(2000).optional(),
  appVersion: z.string().max(80).optional()
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.parse(json);
    const mimeType = parsed.mimeType?.split(";")[0]?.trim().toLowerCase() || "image/jpeg";

    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json(
        { ok: false, error: `Unsupported file type: ${mimeType}` },
        { status: 400 }
      );
    }

    const result = await saveVerifiedBillTraining({
      base64Data: parsed.base64Data,
      mimeType,
      billData: parsed.billData as import("@/lib/bill-parse").ParsedBillShape,
      monthlyUnits: parsed.monthlyUnits ?? undefined,
      notes: parsed.notes ?? null,
      appVersion: parsed.appVersion ?? process.env.npm_package_version ?? null
    });

    if (!result.ok) {
      const status = result.code === "config" ? 503 : 500;
      return NextResponse.json({ ok: false, error: result.error, code: result.code }, { status });
    }

    return NextResponse.json(
      { ok: true, id: result.id, storagePath: result.storagePath },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((i) => i.message).join(", ")
        : error instanceof Error
          ? error.message
          : "Save failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
