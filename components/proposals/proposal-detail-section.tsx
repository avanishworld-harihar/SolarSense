"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function ProposalDetailSection({
  id,
  title,
  subtitle,
  children,
  className,
  variant = "card"
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  /** `workspace` — lower visual weight for long proposal pages (borderless stack). */
  variant?: "card" | "workspace";
}) {
  const isWorkspace = variant === "workspace";

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 space-y-5",
        isWorkspace
          ? "border-t border-slate-200/60 pt-10 dark:border-white/[0.07]"
          : "space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-[#0c1017]/75 sm:p-5",
        className
      )}
    >
      <header className={cn("space-y-1", !isWorkspace && "border-b border-slate-200/70 pb-3 dark:border-white/10")}>
        <h2
          className={cn(
            isWorkspace
              ? "text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100"
              : "text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400"
          )}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className={cn("text-sm", isWorkspace ? "text-slate-500 dark:text-slate-400" : "text-xs font-medium text-slate-600 dark:text-slate-400")}>
            {subtitle}
          </p>
        ) : null}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
