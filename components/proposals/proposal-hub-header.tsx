"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export type ProposalHubHeaderProps = {
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
  className?: string;
  variant?: "hero" | "workspace";
  analytics?: ReactNode;
};

export function ProposalHubHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  action,
  className,
  variant = "hero",
  analytics
}: ProposalHubHeaderProps) {
  const isWorkspace = variant === "workspace";

  return (
    <header className={cn("proposal-hub-header", isWorkspace && "proposal-hub-header--workspace", className)}>
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-80"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 0% 0%, rgba(16, 185, 129, 0.12), transparent 55%), radial-gradient(ellipse 60% 50% at 100% 0%, rgba(56, 189, 248, 0.08), transparent 50%)"
        }}
      />
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            {backHref ? (
              <Link href={backHref} className="proposal-hub-back inline-flex items-center gap-1.5 text-xs font-semibold">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                {backLabel ?? "Back"}
              </Link>
            ) : (
              <span className="proposal-hub-eyebrow inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                SOL.52 · Proposal OS
              </span>
            )}
            <h1 className="proposal-hub-title text-2xl font-bold tracking-tight sm:text-[1.85rem]">{title}</h1>
            <p className="proposal-hub-subtitle max-w-2xl text-sm leading-relaxed">{subtitle}</p>
          </div>
          {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
        </div>
        {analytics ? <div className="relative">{analytics}</div> : null}
      </div>
    </header>
  );
}
