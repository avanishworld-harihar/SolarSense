import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DashboardSectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-2.5 flex items-center gap-2 px-0.5 sm:mb-3", className)}>
      <span
        className="h-1 w-1 shrink-0 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/40 sm:h-1.5 sm:w-1.5 dark:bg-teal-400 dark:shadow-[0_0_14px_rgba(45,212,191,0.55)]"
        aria-hidden
      />
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-white sm:text-xs md:text-sm">
        {children}
      </h2>
    </div>
  );
}
