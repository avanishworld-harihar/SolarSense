"use client";

/**
 * HubViewToggle — pipeline / grid / list view switcher for /proposals.
 *
 * Saves preference to localStorage so it persists across sessions.
 * Default is "pipeline" (E3 objective).
 */

import { Kanban, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type HubViewMode = "pipeline" | "grid" | "list";

const STORAGE_KEY = "ss_proposals_view_mode";

export function readViewMode(): HubViewMode {
  if (typeof window === "undefined") return "pipeline";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "pipeline" || v === "grid" || v === "list") return v;
  return "pipeline";
}

export function writeViewMode(mode: HubViewMode): void {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, mode);
}

const OPTIONS: { mode: HubViewMode; icon: typeof Kanban; label: string }[] = [
  { mode: "pipeline", icon: Kanban, label: "Pipeline" },
  { mode: "grid",     icon: LayoutGrid, label: "Grid" },
  { mode: "list",     icon: List,       label: "List" },
];

export function HubViewToggle({
  value,
  onChange,
  className,
}: {
  value: HubViewMode;
  onChange: (mode: HubViewMode) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border border-slate-200/80 bg-slate-100/60 p-1",
        "dark:border-white/10 dark:bg-white/5",
        className
      )}
    >
      {OPTIONS.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          aria-label={`${label} view`}
          onClick={() => onChange(mode)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200",
            value === mode
              ? "bg-white text-slate-800 shadow-sm dark:bg-white/15 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden strokeWidth={2.25} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
