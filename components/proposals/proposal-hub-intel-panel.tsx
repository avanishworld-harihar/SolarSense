"use client";

import { hubIntelForStatus, statusProgressPct, type ProposalHubRow } from "@/lib/proposal-hub-insights";
import { normalizeProposalStatus } from "@/lib/proposal-status";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function ProposalHubIntelPanel({
  row,
  lang,
  title
}: {
  row: ProposalHubRow | null;
  lang: "en" | "hi";
  title: string;
}) {
  const reduced = useReducedMotion();
  if (!row) {
    return (
      <motion.div className="proposal-hub-intel rounded-xl border border-dashed p-4 text-center text-xs proposal-hub-text-muted">
        {lang === "hi" ? "सूची से एक डील चुनें" : "Select a deal to see recommendations"}
      </motion.div>
    );
  }

  const st = normalizeProposalStatus(row.proposal_status);
  const intel = hubIntelForStatus(st, lang);
  const pct = statusProgressPct(st);

  return (
    <motion.aside
      initial={reduced ? false : { opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      className="proposal-hub-intel rounded-xl border p-4 sm:p-5"
      aria-label={title}
    >
      <div className="proposal-hub-text-accent flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        {title}
      </div>

      <div className="mt-4">
        <div className="proposal-hub-text-muted flex items-center justify-between gap-2 text-[11px]">
          <span>{lang === "hi" ? "डील प्रगति" : "Deal progress"}</span>
          <span className="proposal-hub-text-primary font-semibold tabular-nums">{pct}%</span>
        </div>
        <div className="proposal-hub-progress-track mt-2 h-1.5 overflow-hidden rounded-full">
          <motion.div
            className="proposal-hub-progress-fill h-full rounded-full"
            initial={reduced ? { width: `${pct}%` } : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div
        className={cn(
          "mt-4 rounded-lg border px-3 py-3",
          intel.tone === "action" && "proposal-hub-intel-callout--action",
          intel.tone === "warn" && "proposal-hub-intel-callout--warn",
          intel.tone === "success" && "proposal-hub-intel-callout--success",
          intel.tone === "neutral" && "proposal-hub-intel-callout--neutral"
        )}
      >
        <p className="proposal-hub-text-primary text-sm font-semibold">{intel.title}</p>
        <p className="proposal-hub-text-secondary mt-1.5 text-xs leading-relaxed">{intel.body}</p>
      </div>

      {row.annual_saving_inr != null && row.annual_saving_inr > 0 ? (
        <p className="proposal-hub-text-muted mt-3 text-[11px]">
          {lang === "hi" ? "अनुमानित वार्षिक बचत" : "Est. annual saving"}:{" "}
          <span className="proposal-hub-text-accent font-semibold tabular-nums">
            ₹{Math.round(row.annual_saving_inr).toLocaleString("en-IN")}
          </span>
        </p>
      ) : null}
    </motion.aside>
  );
}
