"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function ProposalDetailSection({
  id,
  title,
  subtitle,
  children,
  className
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-[#0c1017]/75 sm:p-5",
        className
      )}
    >
      <header className="space-y-1 border-b border-slate-200/70 pb-3 dark:border-white/10">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h2>
        {subtitle ? <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{subtitle}</p> : null}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
