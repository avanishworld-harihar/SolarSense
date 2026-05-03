import { normalizeLeadStatus } from "@/lib/lead-status";
import type { CustomerLead } from "@/lib/types";

/** Map a Supabase `leads` row to `CustomerLead` (shared by GET + PATCH). */
export function mapCustomerRow(row: Record<string, unknown>): CustomerLead {
  const phoneRaw = row.phone;
  const phone =
    phoneRaw != null && String(phoneRaw).trim() ? String(phoneRaw).trim() : null;
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    city: String(row.city ?? ""),
    discom: String(row.discom ?? ""),
    monthly_bill: Number(row.monthly_bill ?? row.monthlyBill ?? 0) || 0,
    status: normalizeLeadStatus(String(row.status ?? "new")),
    phone,
    source: row.source != null ? String(row.source) : null,
    last_touched_at: row.last_touched_at != null ? String(row.last_touched_at) : null,
    state: row.state != null ? String(row.state) : null,
    email: row.email != null ? String(row.email) : null,
    consumer_id:
      row.consumer_id != null && String(row.consumer_id).trim()
        ? String(row.consumer_id).trim()
        : null,
    survey_status:
      row.survey_status != null && String(row.survey_status).trim()
        ? String(row.survey_status).trim().toLowerCase()
        : null
  };
}
