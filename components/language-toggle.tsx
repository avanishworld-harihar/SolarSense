"use client";

import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

/**
 * Glass pill: EN | local script. Navy “thumb” + white label on active side; smooth slide (CSS).
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { mode, setMode, localScriptLabel, localShortLabel, t } = useLanguage();
  const isEn = mode === "en";

  return (
    <div
      className={cn(
        "relative isolate inline-flex h-9 w-[5.75rem] shrink-0 items-stretch rounded-full border-[0.5px] border-slate-200/70 bg-slate-100/35 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md dark:border-white/10 dark:bg-slate-950/50 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:h-10 sm:w-[6.25rem]",
        className
      )}
      role="group"
      aria-label={t("language_toggleAria")}
    >
      <span
        className={cn(
          "lang-toggle-thumb pointer-events-none absolute top-1 bottom-1 z-0 w-[calc(50%-4px)] rounded-full bg-[#071226] shadow-[0_4px_14px_rgba(0,0,0,0.32),0_2px_6px_rgba(0,0,0,0.18)] ring-1 ring-black/20 dark:bg-[#030a14] dark:shadow-[0_4px_20px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)] dark:ring-white/10",
          isEn ? "left-1" : "left-[calc(50%+2px)]"
        )}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => setMode("en")}
        className={cn(
          "relative z-[1] flex flex-1 items-center justify-center rounded-full text-[10px] font-extrabold tracking-wide transition-colors duration-200 sm:text-[11px]",
          isEn ? "text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        )}
        aria-pressed={isEn}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setMode("local")}
        className={cn(
          "relative z-[1] flex flex-1 items-center justify-center rounded-full text-sm font-bold leading-none transition-colors duration-200 sm:text-base",
          !isEn ? "text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        )}
        aria-pressed={!isEn}
        title={localShortLabel}
      >
        <span className="select-none" aria-hidden>
          {localScriptLabel}
        </span>
        <span className="sr-only">{localShortLabel}</span>
      </button>
    </div>
  );
}
