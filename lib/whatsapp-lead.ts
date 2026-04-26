import type { AppLocale } from "@/lib/state-to-locale";
import { translate } from "@/lib/translations";

/** Digits only for wa.me */
export function normalizePhoneForWhatsApp(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+/, "");
}

export function buildLeadWhatsAppUrl(
  phone: string,
  customerName: string,
  installerName: string,
  locale: AppLocale
): string | null {
  let digits = normalizePhoneForWhatsApp(phone);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 10) return null;
  const msg = translate(locale, "customers_whatsappPrefill", { customerName, installerName });
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}
