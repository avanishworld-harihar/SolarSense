"use client";

/**
 * BuilderStageBar — 4-stage visual progress indicator for the proposal builder.
 *
 * Stages reflect the logical flow of building a proposal:
 *   ① Client     — select/enter customer info
 *   ② Energy     — upload bills or enter monthly units
 *   ③ System     — review solar sizing & override if needed
 *   ④ Proposal   — set language, preview, generate & send
 *
 * The bar is VISUAL only — it does not gate sections. Clicking a stage
 * smoothly scrolls to the corresponding form anchor. This keeps backward
 * compatibility with the existing builder logic.
 */

import { motion } from "framer-motion";
import {
  BarChart2,
  CheckCircle2,
  FileText,
  User,
  Zap,
} from "lucide-react";
import type { ProposalPresetId } from "@/components/proposals/os/preset-picker";

type Stage = {
  id: string;
  number: number;
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  anchor: string;
};

const STAGES: Stage[] = [
  {
    id: "client",
    number: 1,
    label: "Client",
    subLabel: "Customer info",
    icon: <User className="h-3.5 w-3.5" />,
    anchor: "step-1-anchor",
  },
  {
    id: "energy",
    number: 2,
    label: "Energy",
    subLabel: "Bills & usage",
    icon: <BarChart2 className="h-3.5 w-3.5" />,
    anchor: "step-2-anchor",
  },
  {
    id: "system",
    number: 3,
    label: "System",
    subLabel: "Solar sizing",
    icon: <Zap className="h-3.5 w-3.5" />,
    anchor: "step-3-anchor",
  },
  {
    id: "proposal",
    number: 4,
    label: "Proposal",
    subLabel: "Generate & send",
    icon: <FileText className="h-3.5 w-3.5" />,
    anchor: "step-4-anchor",
  },
];

type Props = {
  presetId: ProposalPresetId | null;
  /** 0-based index of the currently active stage (optional — for future scroll-sync). */
  activeStageIndex?: number;
  /** Which stages have sufficient data (0-based indices). */
  completedStages?: number[];
};

function scrollToAnchor(anchor: string) {
  if (typeof window === "undefined") return;
  const el = document.getElementById(anchor);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function BuilderStageBar({
  presetId,
  activeStageIndex = 0,
  completedStages = [],
}: Props) {
  const completedSet = new Set(completedStages);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="mb-4 overflow-x-auto"
    >
      <div className="flex min-w-max items-stretch gap-0 rounded-2xl border border-slate-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/70 sm:min-w-0">
        {STAGES.map((stage, i) => {
          const isActive = i === activeStageIndex;
          const isDone = completedSet.has(i);
          const isLast = i === STAGES.length - 1;

          return (
            <div key={stage.id} className="flex items-center">
              <button
                type="button"
                onClick={() => scrollToAnchor(stage.anchor)}
                className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-all sm:px-4 sm:py-2.5 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                    : isDone
                      ? "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50"
                      : "text-slate-400 hover:bg-slate-50 dark:text-slate-500 dark:hover:bg-slate-700/30"
                }`}
              >
                {/* Step circle / check */}
                <div
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                    isActive
                      ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                      : isDone
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    stage.number
                  )}
                </div>

                {/* Label */}
                <div className="hidden sm:block">
                  <p className={`text-xs font-bold leading-none ${isActive ? "text-white dark:text-slate-900" : ""}`}>
                    {stage.label}
                  </p>
                  <p
                    className={`mt-0.5 text-[10px] leading-none ${
                      isActive ? "text-white/70 dark:text-slate-900/70" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {stage.subLabel}
                  </p>
                </div>
                {/* Mobile: icon only */}
                <span className="sm:hidden">{stage.icon}</span>
              </button>

              {/* Connector line between stages */}
              {!isLast && (
                <div className={`h-px w-4 flex-shrink-0 sm:w-6 ${isDone ? "bg-emerald-300 dark:bg-emerald-700" : "bg-slate-200 dark:bg-slate-700"}`} />
              )}
            </div>
          );
        })}

        {/* Preset label — far right */}
        {presetId && (
          <div className="ml-auto flex items-center pl-2 pr-2">
            <span
              className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                presetId === "commercial_executive"
                  ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              {presetId === "commercial_executive" ? "Commercial" : "Residential"}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
