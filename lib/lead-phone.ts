/** Normalize phone for DB / tel: links (digits, optional leading +). */
export function normalizeLeadPhoneForStorage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
}

/** Human-readable display — full number, grouped for Indian mobiles when possible. */
export function formatLeadPhoneForDisplay(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return "";
  const trimmed = String(raw).trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length > 10 && trimmed.startsWith("+")) {
    return `+${digits}`;
  }
  return trimmed;
}

/** Best contact number from proposal manual fields (lead field wins over bill). */
export function pickProposalLeadPhone(leadPhone: string, billPhone: string): string {
  return normalizeLeadPhoneForStorage(leadPhone.trim() || billPhone.trim());
}

/** Persist phone on an existing CRM lead (e.g. after proposal save). */
export async function patchLeadPhoneIfProvided(leadId: string, phoneRaw: string): Promise<boolean> {
  const phone = normalizeLeadPhoneForStorage(phoneRaw);
  if (!leadId.trim() || !phone) return false;
  const res = await fetch(`/api/customers/${encodeURIComponent(leadId.trim())}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  });
  return res.ok;
}
