"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { WorkspacePageTone } from "@/lib/workspace-design";

export function WorkspacePageHero({
  eyebrow,
  title,
  subtitle,
  action,
  tone = "customers",
  footer,
  className
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  tone?: WorkspacePageTone;
  /** Lifecycle strip or tabs below the headline row */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "workspace-page-hero glass-panel-premium overflow-hidden p-5 sm:p-6 md:p-7",
        `workspace-page-hero--${tone}`,
        className
      )}
    >
      <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="ws-type-eyebrow">{eyebrow}</p>
          <h1 className="ws-type-greeting mt-2 text-balance">{title}</h1>
          {subtitle ? <p className="ws-type-body mt-2 max-w-2xl">{subtitle}</p> : null}
        </div>
        {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
      </div>
      {footer ? <div className="relative z-[1] mt-4 border-t border-white/50 pt-4 dark:border-white/10">{footer}</div> : null}
    </header>
  );
}

export function WorkspacePageHeroIcon({
  icon: Icon,
  tone = "sky"
}: {
  icon: LucideIcon;
  tone?: "sky" | "emerald" | "amber" | "indigo" | "violet";
}) {
  return (
    <span className={cn("ws-icon-well", `ws-icon-well--${tone}`)} aria-hidden>
      <Icon className="h-4 w-4" strokeWidth={2.25} />
    </span>
  );
}


