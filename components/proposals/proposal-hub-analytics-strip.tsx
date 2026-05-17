"use client";

import type { ProposalHubStats } from "@/lib/proposal-hub-insights";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Clock, IndianRupee, Layers } from "lucide-react";

function formatPipelineInr(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

export function ProposalHubAnalyticsStrip({
  stats,
  labels
}: {
  stats: ProposalHubStats;
  labels: {
    total: string;
    followUp: string;
    approved: string;
    pipeline: string;
  };
}) {
  const reduced = useReducedMotion();
  const tiles = [
    { key: "total", label: labels.total, value: String(stats.total), icon: Layers, tone: "default" as const },
    { key: "follow", label: labels.followUp, value: String(stats.followUp), icon: Clock, tone: "amber" as const },
    { key: "approved", label: labels.approved, value: String(stats.approved), icon: CheckCircle2, tone: "emerald" as const },
    {
      key: "pipeline",
      label: labels.pipeline,
      value: formatPipelineInr(stats.pipelineInr),
      icon: IndianRupee,
      tone: "sky" as const
    }
  ];

  return (
    <div className="proposal-hub-analytics grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {tiles.map((tile, i) => {
        const Icon = tile.icon;
        return (
          <motion.div
            key={tile.key}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            className={cn(
              "proposal-hub-analytics-tile group relative overflow-hidden rounded-xl border p-3 sm:p-3.5",
              tile.tone === "emerald" && "proposal-hub-analytics-tile--emerald",
              tile.tone === "amber" && "proposal-hub-analytics-tile--amber",
              tile.tone === "sky" && "proposal-hub-analytics-tile--sky"
            )}
          >
            <motion.div
              className="flex items-start justify-between gap-2"
              whileHover={reduced ? undefined : { y: -1 }}
              transition={{ duration: 0.15 }}
            >
              <div>
                <p className="proposal-hub-text-muted text-[10px] font-semibold uppercase tracking-wide sm:text-[11px]">{tile.label}</p>
                <p className="proposal-hub-analytics-value mt-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl">
                  {tile.value}
                </p>
              </div>
              <span className="proposal-hub-analytics-icon flex h-8 w-8 items-center justify-center rounded-lg">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
