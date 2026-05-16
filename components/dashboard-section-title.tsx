import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DashboardSectionTitle({
  children,
  className,
  tier = "default"
}: {
  children: ReactNode;
  className?: string;
  /** default = overview; quiet = projects / secondary blocks */
  tier?: "default" | "quiet";
}) {
  return (
    <div className={cn("mb-3 flex items-center gap-2.5 px-0.5 sm:mb-4", tier === "quiet" && "mb-2.5 sm:mb-3", className)}>
      <span
        className={cn(
          "h-4 w-0.5 shrink-0 rounded-full",
          tier === "default"
            ? "bg-gradient-to-b from-brand-500 to-teal-400 shadow-sm shadow-brand-500/25"
            : "bg-slate-300/90 dark:bg-teal-400/70"
        )}
        aria-hidden
      />
      <h2
        className={cn(
          "font-semibold tracking-tight text-slate-700 dark:text-white",
          tier === "default" ? "text-xs uppercase tracking-[0.16em] sm:text-[13px]" : "text-[11px] uppercase tracking-[0.14em] text-slate-500 sm:text-xs"
        )}
      >
        {children}
      </h2>
    </div>
  );
}
