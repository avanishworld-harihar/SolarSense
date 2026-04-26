"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  getLocalLocaleForState,
  LOCALE_TOGGLE_SCRIPT_LABEL,
  LOCALE_TOGGLE_SHORT,
  type AppLocale,
  type LocalScriptLocale
} from "@/lib/state-to-locale";
import { isAllowedLocalLocale } from "@/lib/language-policy";
import { translate as translateMsg } from "@/lib/translations";

const STORAGE_MODE = "ss_ui_lang_mode";
const STORAGE_STATE = "ss_installer_state";
const STORAGE_LOCAL_LOCALE = "ss_ui_local_locale";

export type UiLangMode = "en" | "local";

export type LanguageContextValue = {
  /** User toggle: Universal English vs pure local script. */
  mode: UiLangMode;
  setMode: (m: UiLangMode) => void;
  /** Explicit local script chosen in Settings (optional; falls back to installer state). */
  localPreference: LocalScriptLocale | null;
  setLocalPreference: (locale: LocalScriptLocale) => void;
  /** From installer state (e.g. Tamil Nadu → ta). */
  localScript: LocalScriptLocale;
  /** Effective locale for copy: `en` or the local script. */
  locale: AppLocale;
  /** Latin abbrev. for tooltips / ARIA (HI, TA, …). */
  localShortLabel: string;
  /** Native script on language pill (हि, த, …). */
  localScriptLabel: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

/** Used until `LanguageProvider` mounts (SSR / edge bundling). English copy, no-op toggle. */
const LANGUAGE_FALLBACK_LOCAL: LocalScriptLocale = "hi";

const languageContextFallback: LanguageContextValue = {
  mode: "en",
  setMode: () => {},
  localPreference: null,
  setLocalPreference: () => {},
  localScript: LANGUAGE_FALLBACK_LOCAL,
  locale: "en",
  localShortLabel: LOCALE_TOGGLE_SHORT[LANGUAGE_FALLBACK_LOCAL],
  localScriptLabel: LOCALE_TOGGLE_SCRIPT_LABEL[LANGUAGE_FALLBACK_LOCAL],
  t: (key, vars) => translateMsg("en", key, vars)
};

const LanguageContext = createContext<LanguageContextValue>(languageContextFallback);

function readInstallerState(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_STATE) ?? "";
  } catch {
    return "";
  }
}

function readMode(): UiLangMode {
  if (typeof window === "undefined") return "en";
  try {
    const v = localStorage.getItem(STORAGE_MODE);
    return v === "local" ? "local" : "en";
  } catch {
    return "en";
  }
}

function readLocalPreference(): LocalScriptLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = (localStorage.getItem(STORAGE_LOCAL_LOCALE) ?? "").trim().toLowerCase();
    if (!raw) return null;
    return isAllowedLocalLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UiLangMode>("en");
  const [installerState, setInstallerState] = useState("");
  const [localPreference, setLocalPreferenceState] = useState<LocalScriptLocale | null>(null);

  useEffect(() => {
    setModeState(readMode());
    setInstallerState(readInstallerState());
    setLocalPreferenceState(readLocalPreference());
  }, []);

  const localScript = useMemo(
    () => localPreference ?? getLocalLocaleForState(installerState),
    [localPreference, installerState]
  );

  const locale: AppLocale = useMemo(() => {
    if (mode === "en") return "en";
    return localScript;
  }, [mode, localScript]);

  const setMode = useCallback((m: UiLangMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_MODE, m);
    } catch {
      /* */
    }
  }, []);

  const setLocalPreference = useCallback((locale: LocalScriptLocale) => {
    setLocalPreferenceState(locale);
    try {
      localStorage.setItem(STORAGE_LOCAL_LOCALE, locale);
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_STATE) setInstallerState(e.newValue ?? "");
      if (e.key === STORAGE_MODE) setModeState(readMode());
      if (e.key === STORAGE_LOCAL_LOCALE) setLocalPreferenceState(readLocalPreference());
    };
    const onCustom = () => {
      setInstallerState(readInstallerState());
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("ss-installer-state-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ss-installer-state-changed", onCustom);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale === "en" ? "en" : locale;
  }, [locale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translateMsg(locale, key, vars),
    [locale]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      mode,
      setMode,
      localPreference,
      setLocalPreference,
      localScript,
      locale,
      localShortLabel: LOCALE_TOGGLE_SHORT[localScript],
      localScriptLabel: LOCALE_TOGGLE_SCRIPT_LABEL[localScript],
      t
    }),
    [mode, setMode, localPreference, setLocalPreference, localScript, locale, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

/** Same as `useLanguage` — context always has a value (fallback English before provider mounts). */
export function useLanguageOptional(): LanguageContextValue {
  return useContext(LanguageContext);
}
