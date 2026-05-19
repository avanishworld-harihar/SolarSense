"use client";

import { motion } from "framer-motion";
import { ArrowRight, Layers, Sparkles, TrendingUp, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "commercial_config" | "panel_pricing" | "capacity" | "financing";

const STEPS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "commercial_config", label: "1. Commercial narrative", icon: Sparkles },
  { id: "panel_pricing", label: "2. Panel & pricing", icon: Layers },
  { id: "capacity", label: "3. Capacity scenarios", icon: TrendingUp },
  { id: "financing", label: "4. Financing", icon: CreditCard },
];

type Props = {
  activeTab: string;
  onGoToTab: (tab: TabId) => void;
  className?: string;
};

export function RequirementSetupBanner({ activeTab, onGoToTab, className }: Props) {
  const stepIndex = STEPS.findIndex((s) => s.id === activeTab);
  const current = stepIndex >= 0 ? stepIndex : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mb-4 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50/90 to-indigo-50/70 p-4 shadow-sm backdrop-blur-sm dark:border-sky-800/50 dark:from-sky-950/40 dark:to-indigo-950/30",
        className
      )}
    >
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
        Requirement-based proposal — configure in workspace
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Complete each module, save, then return to the proposal builder to generate the executive deck.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = step.id === activeTab;
          const isPast = i < current;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onGoToTab(step.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                isActive
                  ? "border-sky-500 bg-white text-sky-800 shadow-sm dark:bg-slate-900 dark:text-sky-200"
                  : isPast
                    ? "border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-white/80 bg-white/70 text-slate-600 hover:border-sky-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              {step.label}
              {i < STEPS.length - 1 && !isActive ? (
                <ArrowRight className="hidden h-3 w-3 opacity-40 sm:inline" />
              ) : null}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
