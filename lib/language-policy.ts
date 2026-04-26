import type { LocalScriptLocale } from "@/lib/state-to-locale";

export type LanguageOption = {
  code: "en" | LocalScriptLocale;
  label: string;
  native: string;
  status: "live" | "beta";
};

/** World-class policy: English universal + one local script mode. */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English", native: "English", status: "live" },
  { code: "hi", label: "Hindi", native: "हिन्दी", status: "live" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", status: "beta" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", status: "beta" },
  { code: "ta", label: "Tamil", native: "தமிழ்", status: "live" },
  { code: "te", label: "Telugu", native: "తెలుగు", status: "beta" }
];

export function isAllowedLocalLocale(input: string): input is LocalScriptLocale {
  return LANGUAGE_OPTIONS.some((opt) => opt.code === input && opt.code !== "en");
}
