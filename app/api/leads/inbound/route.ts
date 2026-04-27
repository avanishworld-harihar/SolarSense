import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { processInboundLead } from "@/lib/inbound-leads";
import type { LeadSource } from "@/lib/supabase";
import { extractClientIp, tokenBucket } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SOURCE_VALUES: readonly LeadSource[] = [
  "manual",
  "website",
  "whatsapp",
  "meta_fb",
  "meta_ig",
  "api"
] as const;

/**
 * Sol.52 — single normalized inbound lead pipe.
 *
 * Three callers fan in through here:
 *   1. Website / landing-page form (public; rate-limited per IP).
 *   2. WhatsApp Cloud API webhook (server-to-server; HMAC required).
 *   3. Meta FB/IG Lead Ads webhook (server-to-server; HMAC required).
 *
 * The dedup contract is:
 *   - If `phone` matches an existing row (case-insensitive), bump
 *     `last_touched_at` and merge missing fields → return `{ deduped: true }`.
 *   - Otherwise insert via `createCustomer` and return `{ deduped: false }`.
 *
 * On success the response is shape-compatible with `/api/customers` POST so
 * the customers page can reuse the existing optimistic-update path.
 */

const inboundSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(40)
    .transform((p) => p.replace(/[^\d+]/g, "")),
  city: z.string().trim().min(1).max(160).optional().default(""),
  state: z.string().trim().max(120).optional(),
  discom: z.string().trim().max(160).optional().default(""),
  monthly_bill: z.coerce.number().nonnegative().optional().default(0),
  email: z.string().trim().email().max(160).optional(),
  source: z.enum(SOURCE_VALUES as unknown as [LeadSource, ...LeadSource[]]).default("website"),
  source_meta: z.record(z.string(), z.unknown()).optional()
});

const RATE = {
  capacity: 6,
  refillIntervalMs: 60_000
};

/** Constant-time HMAC-SHA256 comparison — protects the s2s shared secret. */
function verifyServerSecret(req: NextRequest, rawBody: string): boolean {
  const expected = process.env.SOL52_INBOUND_SECRET;
  if (!expected) return false;
  const headerKey = req.headers.get("x-sol52-key");
  if (!headerKey) return false;
  const sig = createHmac("sha256", expected).update(rawBody).digest("hex");
  const provided = Buffer.from(headerKey, "utf8");
  const computed = Buffer.from(sig, "utf8");
  if (provided.length !== computed.length) return false;
  return timingSafeEqual(provided, computed);
}

export async function POST(req: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const trustedServer = verifyServerSecret(req, rawBody);

  /* Public route — throttle per IP. Server-to-server callers (webhooks)
   * bypass the bucket since they've already proven they hold the secret. */
  if (!trustedServer) {
    const ip = extractClientIp(req.headers);
    const limit = tokenBucket({
      key: `inbound:${ip}`,
      capacity: RATE.capacity,
      refillIntervalMs: RATE.refillIntervalMs
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "rate_limited" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000))
          }
        }
      );
    }
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  let payload: z.infer<typeof inboundSchema>;
  try {
    payload = inboundSchema.parse(json);
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
        : "invalid_payload";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    const result = await processInboundLead({
      name: payload.name,
      phone: payload.phone,
      city: payload.city,
      state: payload.state ?? null,
      discom: payload.discom,
      monthly_bill: payload.monthly_bill,
      email: payload.email ?? null,
      source: payload.source,
      source_meta: payload.source_meta ?? null
    });
    return NextResponse.json(
      { ok: true, deduped: result.deduped, data: result.data },
      { status: result.deduped ? 200 : 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "inbound_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
