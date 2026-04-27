import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { processInboundLead } from "@/lib/inbound-leads";
import type { LeadSource } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Sol.52 — Meta FB / IG Lead Ads webhook.
 *
 * Required env (documented in `.env.example`):
 *   - `META_APP_SECRET`       : App Secret for `X-Hub-Signature-256` verification.
 *   - `META_LEAD_PAGE_TOKEN`  : Long-lived Page Access Token to expand lead IDs
 *                               via Graph API.
 *   - `META_VERIFY_TOKEN`     : The string set in Meta's Events Manager GET handshake.
 *
 * Wire-up checklist:
 *   1. Meta Ads Manager → Lead Center → CRM Integration → Webhooks.
 *      Callback URL: `https://<host>/api/webhooks/meta-leads`.
 *      Verify token: value of `META_VERIFY_TOKEN`.
 *   2. Subscribe to the `leadgen` field.
 *   3. Create a test lead; confirm it appears in CRM with `source = 'meta_fb'`.
 *
 * Behavior:
 *   - GET hub.challenge handshake.
 *   - POST `leadgen` events: verify `X-Hub-Signature-256`, look up the lead
 *     via Graph API `/<leadgen_id>?fields=field_data,platform`, map field_data
 *     to our schema, call `processInboundLead`.
 *   - Always return 200 so Meta doesn't retry-flood.
 */

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.META_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ ok: false, error: "verification_failed" }, { status: 403 });
}

/** Constant-time comparison for `X-Hub-Signature-256`. */
function verifyHubSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type FieldData = { name: string; values: string[] }[];

type LeadgenData = {
  id?: string;
  created_time?: number;
  field_data?: FieldData;
  /** 'facebook' | 'instagram' — present when fetching the leadgen object */
  platform?: string;
  ad_id?: string;
  form_id?: string;
};

/** Graph API v19.0 call — returns null on any failure. */
async function fetchLeadgenData(leadgenId: string): Promise<LeadgenData | null> {
  const token = process.env.META_LEAD_PAGE_TOKEN;
  if (!token) {
    console.warn("[meta-leads] META_LEAD_PAGE_TOKEN not set — cannot expand lead.");
    return null;
  }
  const url =
    `https://graph.facebook.com/v19.0/${encodeURIComponent(leadgenId)}` +
    `?fields=field_data,platform,ad_id,form_id,created_time` +
    `&access_token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[meta-leads] Graph API error:", res.status, body.slice(0, 200));
      return null;
    }
    return (await res.json()) as LeadgenData;
  } catch (err) {
    console.warn("[meta-leads] Graph API fetch failed:", err);
    return null;
  }
}

/**
 * Pluck a specific field from `field_data` by any of the provided names.
 * Meta forms use inconsistent casing and naming across campaigns.
 */
function pluckField(fields: FieldData, ...names: string[]): string | undefined {
  const lower = names.map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, "_"));
  for (const f of fields) {
    const fLower = f.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (lower.includes(fLower)) {
      return f.values[0]?.trim() || undefined;
    }
  }
  return undefined;
}

type MetaEntry = {
  id?: string;
  time?: number;
  changes?: {
    field?: string;
    value?: {
      leadgen_id?: string;
      page_id?: string;
      form_id?: string;
      ad_id?: string;
      /** 'facebook' | 'instagram' at the change level */
      platform?: string;
    };
  }[];
};

type MetaPayload = {
  object?: string;
  entry?: MetaEntry[];
};

export async function POST(req: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  if (!verifyHubSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let payload: MetaPayload;
  try {
    payload = JSON.parse(rawBody) as MetaPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (payload.object !== "page" || !Array.isArray(payload.entry)) {
    return NextResponse.json({ ok: true, ignored: "non_leadgen_payload" });
  }

  const ingested: { leadgenId: string; deduped: boolean }[] = [];

  for (const entry of payload.entry) {
    const changes = entry.changes ?? [];
    for (const change of changes) {
      if (change.field !== "leadgen") continue;
      const val = change.value ?? {};
      const leadgenId = val.leadgen_id;
      if (!leadgenId) continue;

      /** Determine source channel from the change payload before the Graph call. */
      const platformRaw = (val.platform ?? "").toLowerCase();
      const source: LeadSource =
        platformRaw === "instagram" ? "meta_ig" : "meta_fb";

      const leadgenData = await fetchLeadgenData(leadgenId);
      if (!leadgenData?.field_data?.length) {
        console.warn("[meta-leads] No field_data for leadgen_id:", leadgenId);
        continue;
      }

      const fields = leadgenData.field_data;
      /** Platform at the leadgen level may be more accurate than the change level. */
      const resolvedSource: LeadSource =
        (leadgenData.platform ?? "").toLowerCase() === "instagram"
          ? "meta_ig"
          : source;

      const fullName =
        pluckField(fields, "full_name", "name", "first_name") ?? "";
      const firstName = pluckField(fields, "first_name") ?? "";
      const lastName = pluckField(fields, "last_name") ?? "";
      const name =
        fullName ||
        [firstName, lastName].filter(Boolean).join(" ").trim() ||
        "Meta Lead";

      const phone =
        pluckField(fields, "phone_number", "phone", "mobile", "mobile_number") ?? "";
      const email =
        pluckField(fields, "email", "email_address") ?? undefined;
      const city =
        pluckField(fields, "city", "city_name", "location") ?? "";
      const state =
        pluckField(fields, "state", "state_name", "province") ?? null;
      const monthlyBillRaw = pluckField(
        fields,
        "monthly_bill",
        "electricity_bill",
        "current_monthly_bill",
        "bill_amount"
      );
      const monthly_bill = monthlyBillRaw
        ? Math.max(0, Number(monthlyBillRaw.replace(/[^0-9.]/g, "")))
        : 0;

      try {
        const result = await processInboundLead({
          name,
          phone,
          city,
          state,
          email: email ?? null,
          monthly_bill: Number.isFinite(monthly_bill) ? monthly_bill : 0,
          source: resolvedSource,
          source_meta: {
            leadgen_id: leadgenId,
            ad_id: val.ad_id ?? leadgenData.ad_id ?? null,
            form_id: val.form_id ?? leadgenData.form_id ?? null,
            page_id: val.page_id ?? entry.id ?? null,
            platform: resolvedSource,
            created_time: leadgenData.created_time ?? null
          }
        });
        ingested.push({ leadgenId, deduped: result.deduped });
      } catch (err) {
        console.warn("[meta-leads] processInboundLead failed:", err);
      }
    }
  }

  /**
   * Meta retries on non-2xx — always return 200 even if nothing was ingested
   * so a temporary DB blip doesn't trigger a retry storm.
   */
  return NextResponse.json({ ok: true, ingested });
}
