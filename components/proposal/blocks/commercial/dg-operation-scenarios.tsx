"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Battery, CloudOff, Sun, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Scenario = {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: React.ElementType;
  flows: { from: string; to: string; active: boolean }[];
  accent: string;
};

type Props = {
  systemKw: number;
  presentation?: boolean;
};

export function DgOperationScenarios({ systemKw, presentation }: Props) {
  const scenarios: Scenario[] = [
    {
      id: "day",
      label: "Daytime",
      title: "Solar powers major load",
      description: `${systemKw} kW PV meets daytime HVAC, lighting, and process loads. Grid import minimized.`,
      icon: Sun,
      flows: [
        { from: "Solar", to: "Loads", active: true },
        { from: "Grid", to: "Balance", active: false },
        { from: "DG", to: "Standby", active: false },
      ],
      accent: "amber",
    },
    {
      id: "peak",
      label: "Peak load",
      title: "Solar + grid support",
      description: "Hybrid controller blends solar export with grid import. DG remains on standby unless configured for peak shaving.",
      icon: Zap,
      flows: [
        { from: "Solar", to: "Loads", active: true },
        { from: "Grid", to: "Loads", active: true },
        { from: "DG", to: "Standby", active: false },
      ],
      accent: "sky",
    },
    {
      id: "outage",
      label: "Grid failure",
      title: "DG supports critical loads",
      description: "ATS isolates grid. Solar + DG feed critical circuits — life safety, IT, cold chain, and essential plant.",
      icon: CloudOff,
      flows: [
        { from: "Solar", to: "Critical", active: true },
        { from: "DG", to: "Critical", active: true },
        { from: "Grid", to: "Isolated", active: false },
      ],
      accent: "rose",
    },
  ];

  const [active, setActive] = useState(scenarios[0].id);
  const current = scenarios.find((s) => s.id === active) ?? scenarios[0];
  const Icon = current.icon;

  return (
    <div className={cn("space-y-4", presentation && "text-lg")}>
      <div className="flex flex-wrap gap-2">
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition-all touch-manipulation",
              active === s.id
                ? "border-sky-500 bg-sky-600 text-white shadow-md"
                : "border-slate-200 bg-white text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "rounded-2xl border p-4 sm:p-5",
            current.accent === "amber" && "border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20",
            current.accent === "sky" && "border-sky-200/80 bg-sky-50/50 dark:border-sky-900/40 dark:bg-sky-950/20",
            current.accent === "rose" && "border-rose-200/80 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20"
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white",
                current.accent === "amber" && "bg-amber-500",
                current.accent === "sky" && "bg-sky-600",
                current.accent === "rose" && "bg-rose-600"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{current.label}</p>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">{current.title}</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{current.description}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {current.flows.map((f) => (
              <div
                key={`${f.from}-${f.to}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold",
                  f.active
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-slate-200 bg-slate-50 text-slate-400 opacity-60 dark:border-white/10 dark:bg-white/5"
                )}
              >
                <span>{f.from}</span>
                <span aria-hidden>→</span>
                <span>{f.to}</span>
                {f.from === "DG" && f.active ? <Battery className="h-3 w-3" /> : null}
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
