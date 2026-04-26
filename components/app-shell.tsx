"use client";

import { BrandLogo } from "@/components/brand-logo";
import { DesktopTopNav } from "@/components/desktop-top-nav";
import { applyPerformanceMode, readPerformanceMode } from "@/lib/performance-mode";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

/** Full-width on small screens; capped width + horizontal padding on large screens (SaaS layout). */
export function pageContainerClass(extra?: string) {
  return cn(
    "mx-auto w-full max-w-full px-3 sm:px-4 md:px-5 lg:max-w-6xl lg:px-6 xl:max-w-7xl 2xl:px-8",
    extra
  );
}

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  useEffect(() => {
    applyPerformanceMode(readPerformanceMode());
  }, []);

  return (
    <div className="flex min-h-screen min-h-svh w-full max-w-[100vw] flex-col overflow-x-hidden">
      <header
        className={cn(
          "app-chrome-header sticky top-0 z-[100]",
          "border-b border-white/20 shadow-[0_8px_24px_rgba(15,35,62,0.08)]",
          "bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(248,252,255,0.82)_100%)] backdrop-blur-[10px]",
          "dark:border-white/10 dark:bg-[rgba(15,23,42,0.84)] dark:backdrop-blur-[10px] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        )}
      >
        <div
          className={cn(
            pageContainerClass("!px-6 py-4"),
            "flex items-center gap-4 sm:gap-5 lg:gap-6 xl:gap-8"
          )}
        >
          <div className="flex shrink-0 items-center bg-transparent">
            <BrandLogo />
          </div>

          <DesktopTopNav />

          <div className="ml-auto flex min-w-0 max-w-[min(100%,18rem)] flex-1 items-center justify-end gap-3 sm:max-w-none sm:flex-none sm:gap-4 lg:max-w-[22rem]">
            <h1 className="min-w-0 flex-1 truncate text-right text-[10px] font-extrabold leading-tight tracking-tight text-brand-900 dark:text-foreground sm:text-xs sm:flex-none lg:text-sm xl:max-w-[16rem] xl:text-base">
              {title}
            </h1>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="app-shell flex min-h-0 min-w-0 flex-1 flex-col">
        <section
          className={cn(
            pageContainerClass(),
            "min-h-screen flex-1 space-y-3 overflow-x-hidden pb-0 pt-3 sm:space-y-4 sm:pt-4 md:space-y-5 md:pt-5 lg:pb-0 lg:pt-6"
          )}
        >
          {children}
        </section>
      </main>
    </div>
  );
}
