/**
 * Maps installer-selected Indian state/UT to primary local script locale for the EN ⟷ Local toggle.
 * Add `te` / `gu` (etc.) message packs in `i18n-messages.ts` when expanding copy.
 */
export type LocalScriptLocale = "hi" | "ta" | "kn" | "te" | "ml" | "gu" | "mr" | "bn";

/** Latin abbreviations (ARIA / debugging). */
export const LOCALE_TOGGLE_SHORT: Record<LocalScriptLocale, string> = {
  hi: "HI",
  ta: "TA",
  kn: "KN",
  te: "TE",
  ml: "ML",
  gu: "GU",
  mr: "MR",
  bn: "BN"
};

/** Native script shown on the right side of the header language pill (e.g. हि, த). */
export const LOCALE_TOGGLE_SCRIPT_LABEL: Record<LocalScriptLocale, string> = {
  hi: "हि",
  ta: "த",
  kn: "ಕ",
  te: "తె",
  ml: "മ",
  gu: "ગુ",
  mr: "म",
  bn: "ব"
};

/** Normalize state string from `ss_installer_state` (exact names from INDIAN_STATES_AND_UTS). */
export function getLocalLocaleForState(stateName: string): LocalScriptLocale {
  const s = stateName.trim().toLowerCase();
  if (!s) return "hi";

  if (s.includes("tamil")) return "ta";
  if (s.includes("kerala")) return "ml";
  if (s.includes("karnataka")) return "kn";
  if (s.includes("telangana") || s.includes("andhra")) return "te";
  if (s.includes("gujarat")) return "gu";
  if (s.includes("maharashtra") || s.includes("goa")) return "mr";
  if (s.includes("west bengal")) return "bn";
  if (s.includes("punjab")) return "hi";

  return "hi";
}

export type AppLocale = "en" | LocalScriptLocale;

export const ALL_APP_LOCALES: AppLocale[] = ["en", "hi", "ta", "kn", "te", "ml", "gu", "mr", "bn"];

/** Resolution order when a key is missing in the active locale. */
export function localeFallbackChain(active: AppLocale): AppLocale[] {
  if (active === "en") return ["en"];
  const secondary: AppLocale[] = ["en"];
  if (active !== "hi" && active !== "ta") {
    return [active, ...secondary];
  }
  return [active, ...secondary];
}
