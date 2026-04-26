/**
 * Sol.52 i18n — runtime lookup (`translate`, `interpolate`).
 *
 * Message packs live in `i18n-messages.ts` so this module loads after dictionaries are defined
 * (clean webpack/RSC init order; avoids “Cannot read properties of undefined (reading 'call')”
 * from circular or order-dependent bundles).
 *
 * **State → locale:** `lib/state-to-locale.ts`. UI mode: `LanguageProvider` + `ss_ui_lang_mode`.
 */
import type { AppLocale } from "@/lib/state-to-locale";
import { localeFallbackChain } from "@/lib/state-to-locale";
import { EN, MESSAGES } from "@/lib/i18n-messages";

export type MessageKey = keyof typeof EN;

export { EN, MESSAGES } from "@/lib/i18n-messages";

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function translate(locale: AppLocale, key: string, vars?: Record<string, string | number>): string {
  let raw = "";
  for (const L of localeFallbackChain(locale)) {
    const pack = MESSAGES[L];
    const v = pack?.[key];
    if (v) {
      raw = v;
      break;
    }
  }
  if (!raw) {
    raw = (EN as unknown as Record<string, string>)[key] ?? key;
  }
  return interpolate(raw, vars);
}
