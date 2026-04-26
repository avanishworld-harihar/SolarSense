"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";

import { ThemeProvider } from "@/components/theme-provider";
import { TouchOptimizeBootstrap } from "@/components/touch-optimize-bootstrap";
import { ToastProvider } from "@/components/ui/toast-center";
import { LanguageProvider } from "@/lib/language-context";

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "cache-control": "no-cache" }
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error ?? "Failed to load");
  return payload.data;
};

/**
 * Root client shell: Language → Theme → SWR. Imported from `app/layout.tsx` only.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <TouchOptimizeBootstrap />
      <ThemeProvider>
        <ToastProvider>
          <SWRConfig
            value={{
              fetcher,
              /* iPad / PWA: focus churn while tapping bottom nav was triggering expensive refetches and main-thread work */
              revalidateOnFocus: false,
              revalidateOnReconnect: true,
              dedupingInterval: 30_000,
              errorRetryCount: 2,
              errorRetryInterval: 2_000,
              focusThrottleInterval: 5_000,
              keepPreviousData: true
            }}
          >
            {children}
          </SWRConfig>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
