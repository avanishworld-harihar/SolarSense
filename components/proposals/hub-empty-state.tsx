"use client";

/**
 * HubEmptyState — premium empty state for /proposals with zero deals.
 *
 * Shows an illustrative message + CTA.
 * Two variants:
 *   "no-proposals" — never generated any proposal
 *   "no-results"   — search/filter returned nothing
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, Plus, Search, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type EmptyStateVariant = "no-proposals" | "no-results";

export function HubEmptyState({
  variant = "no-proposals",
  onClearFilter,
  className,
}: {
  variant?: EmptyStateVariant;
  onClearFilter?: () => void;
  className?: string;
}) {
  if (variant === "no-results") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-8 py-16 text-center",
          "dark:border-white/10 dark:bg-white/[0.02]",
          className
        )}
      >
        <Search className="mb-4 h-10 w-10 text-slate-300 dark:text-slate-600" strokeWidth={1.5} aria-hidden />
        <p className="text-base font-bold text-slate-700 dark:text-slate-200">No proposals found</p>
        <p className="mt-2 max-w-sm text-sm text-slate-400 dark:text-slate-500">
          Try a different search term or clear the filter to see all proposals.
        </p>
        {onClearFilter && (
          <button
            type="button"
            onClick={onClearFilter}
            className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            Clear filter
          </button>
        )}
      </motion.div>
    );
  }

  // no-proposals: first-time empty
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-dashed border-teal-200/70 bg-gradient-to-br from-teal-50/80 via-white to-sky-50/60 px-8 py-16 text-center",
        "dark:border-teal-500/20 dark:from-teal-500/8 dark:via-transparent dark:to-sky-500/5",
        className
      )}
    >
      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(20,184,166,0.12), transparent 70%)"
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* Icon cluster */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-200/80 bg-white shadow-md dark:border-teal-500/20 dark:bg-teal-500/10">
            <FileText className="h-7 w-7 text-teal-600 dark:text-teal-400" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200/70 bg-white shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <Zap className="h-5 w-5 text-emerald-500" strokeWidth={2} aria-hidden />
          </div>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Your proposal pipeline is empty
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Generate your first solar proposal in under 2 minutes. Upload a customer bill,
          configure the system, and get a professional shareable proposal instantly.
        </p>

        {/* Steps */}
        <div className="mt-8 grid max-w-xs grid-cols-3 gap-4 text-center">
          {[
            { step: "1", label: "Upload bill" },
            { step: "2", label: "Set system" },
            { step: "3", label: "Generate" },
          ].map(({ step, label }) => (
            <div key={step} className="flex flex-col items-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-black text-white dark:bg-teal-500">
                {step}
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        <Link
          href="/proposal"
          className={cn(
            "mt-8 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold",
            "bg-teal-600 text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 active:scale-[0.98]",
            "dark:bg-teal-500 dark:shadow-teal-500/20 dark:hover:bg-teal-400"
          )}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Create first proposal
        </Link>
      </div>
    </motion.div>
  );
}
