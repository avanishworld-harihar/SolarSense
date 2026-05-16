import { normalizeLeadPhoneForStorage } from "@/lib/lead-phone";
import {
  createCustomer,
  findLeadByPhone,
  refreshLeadFromInbound,
  type CustomerInput,
  type LeadSource
} from "@/lib/supabase";

export type InboundLeadInput = {
  name: string;
  phone: string;
  city?: string;
  state?: string | null;
  discom?: string;
  monthly_bill?: number;
  email?: string | null;
  /** Optional DISCOM consumer number (bill). */
  consumer_id?: string | null;
  /** Site survey CRM step (`not_started` | `scheduled` | `complete`). */
  survey_status?: string | null;
  source: LeadSource;
  source_meta?: Record<string, unknown> | null;
};

export type InboundLeadResult = {
  deduped: boolean;
  data: Record<string, unknown>;
};

/**
 * Sol.52 — single source of truth for "absorb a new lead".
 *
 * Both `/api/leads/inbound` (public + s2s) and the Meta / WhatsApp webhook
 * routes call this. Centralizing the dedup + insert path means:
 *   - There is exactly ONE place where attribution is set.
 *   - Adding a new ingestion channel costs zero net new logic.
 *   - The unique-phone race fallback (Postgres 23505) is handled once.
 */
export async function processInboundLead(input: InboundLeadInput): Promise<InboundLeadResult> {
  const phone = normalizeLeadPhoneForStorage(input.phone);
  const consumerTrim =
    input.consumer_id != null && String(input.consumer_id).trim().length > 0
      ? String(input.consumer_id).trim()
      : undefined;
  const surveyTrim =
    input.survey_status != null && String(input.survey_status).trim().length > 0
      ? String(input.survey_status).trim().toLowerCase()
      : undefined;
  const customerInput: CustomerInput = {
    name: input.name.trim(),
    city: (input.city ?? "").trim(),
    state: input.state ?? null,
    discom: (input.discom ?? "").trim(),
    email: input.email ?? null,
    monthly_bill: typeof input.monthly_bill === "number" && input.monthly_bill > 0 ? input.monthly_bill : 0,
    phone,
    status: "new",
    source: input.source,
    source_meta: input.source_meta ?? null,
    ...(consumerTrim ? { consumer_id: consumerTrim } : {}),
    ...(surveyTrim ? { survey_status: surveyTrim } : {})
  };

  if (phone) {
    const existing = await findLeadByPhone(phone);
    if (existing && existing.id) {
      const refreshed = await refreshLeadFromInbound(String(existing.id), customerInput);
      return { deduped: true, data: refreshed ?? existing };
    }
  }

  try {
    const created = (await createCustomer(customerInput)) as Record<string, unknown>;
    return { deduped: false, data: created };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    /** Concurrent insert race — the unique partial index protected us. Surface as deduped. */
    if (/duplicate key|23505|leads_phone_unique/i.test(message) && phone) {
      const existing = await findLeadByPhone(phone);
      if (existing) return { deduped: true, data: existing };
    }
    throw error;
  }
}
