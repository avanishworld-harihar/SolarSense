import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { processInboundLead } from "@/lib/inbound-leads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Sol.52 — WhatsApp Cloud API webhook.
 *
 * Required env:
 *   - `WA_VERIFY_TOKEN`  : the token configured on the Meta dashboard for the
 *                          verification handshake (GET).
 *   - `WA_APP_SECRET`    : Meta App Secret used to verify the
 *                          `X-Hub-Signature-256` header on POSTs.
 *
 * Wire-up checklist:
 *   1. In Meta WhatsApp Manager → Configuration, set the callback URL to
 *      `https://<your-domain>/api/webhooks/whatsapp` and the verify token to
 *      whatever you put in `WA_VERIFY_TOKEN`.
 *   2. Subscribe the WABA to the `messages` field.
 *   3. Send a test message from your personal WhatsApp to the business number
 *      and confirm a row appears under CRM with `source = 'whatsapp'`.
 *
 * Behavior:
 *   - GET hub.challenge handshake → echo back challenge if token matches.
 *   - POST `messages` event → extract first new contact + message + wa_id,
 *     hand off to `processInboundLead({ source: 'whatsapp' })`.
 */

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WA_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ ok: false, error: "verification_failed" }, { status: 403 });
}

/** Constant-time signature comparison against `WA_APP_SECRET`. */
function verifyMetaSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WA_APP_SECRET;
  if (!secret || !header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type WaContact = { profile?: { name?: string }; wa_id?: string };
type WaMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
};
type WaMetadata = { display_phone_number?: string; phone_number_id?: string };
type WaValue = {
  messaging_product?: string;
  metadata?: WaMetadata;
  contacts?: WaContact[];
  messages?: WaMessage[];
};
type WaChange = { field?: string; value?: WaValue };
type WaEntry = { id?: string; changes?: WaChange[] };
type WaPayload = { object?: string; entry?: WaEntry[] };

/**
 * Pluck a usable display name out of a WhatsApp message.
 * Falls back to the truncated wa_id so the CRM row never lands as an empty
 * string (which would fail our zod min(2)).
 */
function deriveLeadName(contact: WaContact, waId: string | undefined): string {
  const profileName = contact.profile?.name?.trim();
  if (profileName) return profileName;
  return `WhatsApp +${(waId ?? "lead").replace(/[^\d]/g, "").slice(-10) || "lead"}`;
}

function deriveFirstMessageText(msg: WaMessage | undefined): string | undefined {
  if (!msg) return undefined;
  return (
    msg.text?.body?.trim() ||
    msg.button?.text?.trim() ||
    msg.interactive?.button_reply?.title?.trim() ||
    msg.interactive?.list_reply?.title?.trim() ||
    undefined
  );
}

export async function POST(req: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  if (!verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let payload: WaPayload;
  try {
    payload = JSON.parse(rawBody) as WaPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) {
    /* Always 200 to keep Meta happy; we just don't have anything to do. */
    return NextResponse.json({ ok: true, ignored: "non_whatsapp_payload" });
  }

  const ingested: { id: string; deduped: boolean }[] = [];

  for (const entry of payload.entry) {
    const changes = entry.changes ?? [];
    for (const change of changes) {
      if (change.field !== "messages") continue;
      const value = change.value ?? {};
      const messages = value.messages ?? [];
      const contacts = value.contacts ?? [];
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!messages.length || !contacts.length) continue;

      /* Process each message individually. Phone dedup at the DB level
       * means re-firing on retry stays idempotent. */
      for (const msg of messages) {
        const waId = msg.from ?? contacts[0]?.wa_id;
        if (!waId) continue;
        const contactForMessage =
          contacts.find((c) => c.wa_id === waId) ?? contacts[0];
        const leadName = deriveLeadName(contactForMessage, waId);
        const firstText = deriveFirstMessageText(msg);

        try {
          const result = await processInboundLead({
            name: leadName,
            phone: `+${waId.replace(/[^\d]/g, "")}`,
            source: "whatsapp",
            source_meta: {
              wa_message_id: msg.id ?? null,
              wa_id: waId,
              phone_number_id: phoneNumberId ?? null,
              first_message_preview: firstText ?? null,
              message_type: msg.type ?? null
            }
          });
          if (result.data?.id) {
            ingested.push({ id: String(result.data.id), deduped: result.deduped });
          }
        } catch (err) {
          console.warn("[whatsapp webhook] processInboundLead failed:", err);
        }
      }
    }
  }

  /**
   * Always return 200 OK to Meta — non-2xx triggers webhook retries that
   * would just re-flood the dedup path.
   */
  return NextResponse.json({ ok: true, ingested });
}
