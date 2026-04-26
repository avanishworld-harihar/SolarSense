import type { AppLocale } from "@/lib/state-to-locale";
import { translate } from "@/lib/translations";

export function formatCacheAgeLocale(locale: AppLocale, ageMs: number | null): string {
  if (ageMs == null || !Number.isFinite(ageMs) || ageMs < 0) {
    return translate(locale, "cache_session");
  }
  const m = Math.floor(ageMs / 60_000);
  if (m < 1) return translate(locale, "cache_just");
  if (m < 60) return translate(locale, "cache_min", { n: m });
  const h = Math.floor(m / 60);
  if (h < 48) return translate(locale, "cache_hours", { n: h });
  const d = Math.floor(h / 24);
  return translate(locale, "cache_days", { n: d });
}

export function formatLastFollowUpLocale(locale: AppLocale, ts: number): string {
  const ageMs = Date.now() - ts;
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return translate(locale, "customers_neverFollowedUp");
  }
  const m = Math.floor(ageMs / 60_000);
  if (m < 1) return translate(locale, "followup_just");
  if (m < 60) return translate(locale, "followup_min", { n: m });
  const h = Math.floor(m / 60);
  if (h < 48) return translate(locale, "followup_hours", { n: h });
  const d = Math.floor(h / 24);
  return translate(locale, "followup_days", { n: d });
}
