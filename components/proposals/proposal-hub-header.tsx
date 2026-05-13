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
  /** Calmer hub chrome — flat surface, no hero gradient. */
  variant?: "hero" | "workspace";
};

export function ProposalHubHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  action,
  className,
  variant = "hero"
}: ProposalHubHeaderProps) {
  const isWorkspace = variant === "workspace";

  return (
    <header
      className={cn(
        isWorkspace
          ? "relative rounded-xl border border-slate-200/60 bg-white p-5 text-slate-900 dark:border-white/[0.08] dark:bg-[#0c1017] dark:text-slate-100"
          : "relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/90 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] dark:border-white/10 dark:from-[#0b1220] dark:via-[#0f172a] dark:to-emerald-950/80",
        className
      )}
    >
      {!isWorkspace ? (
        <div
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl"
          aria-hidden
        />
      ) : null}
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          {backHref ? (
            <Link
              href={backHref}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide transition",
                isWorkspace
                  ? "font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  : "text-teal-200/90 hover:text-white"
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {backLabel ?? "Back"}
            </Link>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]",
                isWorkspace ? "text-slate-400 dark:text-slate-500" : "text-teal-200/90"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Sol.52
            </span>
          )}
          <h1 className={cn("tracking-tight", isWorkspace ? "text-2xl font-semibold sm:text-[1.75rem]" : "text-2xl font-black sm:text-3xl")}>
            {title}
          </h1>
          <p
            className={cn(
              "max-w-xl leading-relaxed",
              isWorkspace ? "text-sm text-slate-500 dark:text-slate-400" : "text-sm font-medium text-slate-200/90"
            )}
          >
            {subtitle}
          </p>
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </header>
  );
}
