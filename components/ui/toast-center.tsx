"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastEntry = ToastInput & {
  id: string;
  tone: ToastTone;
};

type ToastContextValue = {
  push: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toneClasses(tone: ToastTone): string {
  if (tone === "success") {
    return "border-emerald-200/80 bg-emerald-50/95 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-900/25 dark:text-emerald-100";
  }
  if (tone === "error") {
    return "border-rose-200/80 bg-rose-50/95 text-rose-900 dark:border-rose-500/40 dark:bg-rose-900/25 dark:text-rose-100";
  }
  return "border-sky-200/80 bg-sky-50/95 text-sky-900 dark:border-sky-500/40 dark:bg-sky-900/25 dark:text-sky-100";
}

function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") return <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />;
  if (tone === "error") return <XCircle className="h-4 w-4 shrink-0" aria-hidden />;
  return <Info className="h-4 w-4 shrink-0" aria-hidden />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastEntry[]>([]);

  const push = useCallback((input: ToastInput) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tone = input.tone ?? "info";
    const entry: ToastEntry = {
      id,
      tone,
      title: input.title,
      description: input.description,
      durationMs: input.durationMs ?? 2800
    };
    setItems((prev) => [...prev, entry].slice(-4));
    const timer = window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, entry.durationMs);
    return () => window.clearTimeout(timer);
  }, []);

  const api = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, description) => push({ title, description, tone: "success" }),
      error: (title, description) => push({ title, description, tone: "error", durationMs: 3600 }),
      info: (title, description) => push({ title, description, tone: "info" })
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(92vw,22rem)] flex-col gap-2 sm:bottom-6 sm:right-6">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto ss-toast-pop rounded-xl border px-3.5 py-3 shadow-[0_18px_44px_-22px_rgba(15,23,42,0.55)] backdrop-blur-md",
              toneClasses(item.tone)
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-2.5">
              <ToneIcon tone={item.tone} />
              <div className="min-w-0">
                <p className="text-xs font-extrabold sm:text-sm">{item.title}</p>
                {item.description ? <p className="mt-0.5 text-[11px] font-semibold opacity-90 sm:text-xs">{item.description}</p> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
