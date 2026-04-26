import type { DiscomOption } from "@/lib/supabase-discoms";

export const INSTALLER_STATE_KEY = "ss_installer_state";
export const INSTALLER_DISCOM_KEY = "ss_installer_discom";
/** Kept for backward compatibility with `LanguageProvider` and other listeners. */
export const INSTALLER_REGION_EVENT = "ss-installer-state-changed";

export function installerDiscomsUrl(state: string): string {
  return `/api/discoms?state=${encodeURIComponent(state.trim())}`;
}

export function readInstallerRegion(): { state: string; discom: string } {
  if (typeof window === "undefined") return { state: "", discom: "" };
  try {
    const state = (localStorage.getItem(INSTALLER_STATE_KEY) ?? "").trim();
    const discom = (localStorage.getItem(INSTALLER_DISCOM_KEY) ?? "").trim();
    return { state, discom };
  } catch {
    return { state: "", discom: "" };
  }
}

/**
 * Persists operating state + DISCOM code and notifies listeners (dashboard, language, etc.).
 */
export function writeInstallerRegion(state: string, discom: string): void {
  const s = state.trim();
  const d = discom.trim();
  if (!s || !d) return;
  try {
    localStorage.setItem(INSTALLER_STATE_KEY, s);
    localStorage.setItem(INSTALLER_DISCOM_KEY, d);
    window.dispatchEvent(new Event(INSTALLER_REGION_EVENT));
  } catch {
    /* quota / private mode */
  }
}

/** If saved code matches a row, keep it; else first list entry; else fallback code. */
export function resolveDiscomCode(saved: string, options: DiscomOption[], fallback = "MPPKVVCL"): string {
  const t = saved.trim();
  if (options.length === 0) return t || fallback;
  const hit = options.find((o) => o.code.toLowerCase() === t.toLowerCase());
  if (hit) return hit.code;
  return options[0]?.code || t || fallback;
}

/** Keep a value that is not in Supabase yet still selectable (e.g. offline / legacy code). */
export function mergeSavedDiscomOption(saved: string, options: DiscomOption[]): DiscomOption[] {
  const t = saved.trim();
  if (!t) return options;
  if (options.some((o) => o.code.toLowerCase() === t.toLowerCase())) return options;
  return [{ id: `__saved_${t}`, code: t, name: `${t} (saved)` }, ...options];
}
