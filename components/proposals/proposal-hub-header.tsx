"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export type ProposalHubHeaderProps = {
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  className?: string;
};

export function ProposalHubHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  action,
  className
}: ProposalHubHeaderProps) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/90 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] dark:border-white/10 dark:from-[#0b1220] dark:via-[#0f172a] dark:to-emerald-950/80",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          {backHref ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal-200/90 transition hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {backLabel ?? "Back"}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-200/90">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Sol.52
            </span>
          )}
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-200/90">{subtitle}</p>
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </header>
  );
}
