"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

/** Sun/Moon control — pairs with `ThemeProvider` (`next-themes`). */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[0.5px] border-transparent sm:h-10 sm:w-10",
          className
        )}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[0.5px] border-white/70 bg-white/25 text-brand-800 shadow-[0_6px_20px_rgba(11,34,64,0.08),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl backdrop-saturate-150 transition-colors hover:bg-white/40 dark:border-white/12 dark:bg-white/[0.08] dark:text-amber-100 dark:shadow-[0_6px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-white/[0.12]",
        className
      )}
      aria-label={isDark ? t("theme_toggleToLight") : t("theme_toggleToDark")}
      aria-pressed={isDark}
    >
      {isDark ? (
        <Sun className="h-[1.05rem] w-[1.05rem] sm:h-5 sm:w-5" strokeWidth={2.25} aria-hidden />
      ) : (
        <Moon className="h-[1.05rem] w-[1.05rem] sm:h-5 sm:w-5" strokeWidth={2.25} aria-hidden />
      )}
    </button>
  );
}
