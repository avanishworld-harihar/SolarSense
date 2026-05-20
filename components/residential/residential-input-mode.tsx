"use client";

import { cn } from "@/lib/utils";
import { Check, ClipboardList, FileUp } from "lucide-react";
import type { ResidentialInputMode } from "@/components/residential/residential-proposal-mode-picker";

function ModeTile({
  active,
  icon: Icon,
  title,
  hint,
  onSelect,
  accent,
}: {
  active: boolean;
  icon: React.ElementType;
  title: string;
  hint: string;
  onSelect: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-start gap-1 rounded-2xl border p-3.5 text-left transition-all touch-manipulation",
        active
          ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50/80 shadow-md ring-1 ring-emerald-300/60 dark:from-emerald-950/40 dark:to-teal-950/20"
          : "border-slate-200 bg-white hover:border-emerald-200 dark:border-white/10 dark:bg-white/5"
      )}
    >
      {active ? (
        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-3 w-3 stroke-[3]" />
        </span>
      ) : null}
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-white", accent)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="pr-6 text-[13px] font-bold text-slate-900 dark:text-white">{title}</span>
      <span className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">{hint}</span>
    </button>
  );
}

type Props = {
  mode: ResidentialInputMode;
  onModeChange: (mode: ResidentialInputMode) => void;
  className?: string;
};

export function ResidentialInputModeSelector({ mode, onModeChange, className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
        Residential generation method
      </p>
      <div className="grid grid-cols-2 gap-2">
        <ModeTile
          active={mode === "bill"}
          icon={FileUp}
          title="Bill-based"
          hint="Upload bill · full audit path"
          accent="bg-gradient-to-br from-amber-500 to-orange-600"
          onSelect={() => onModeChange("bill")}
        />
        <ModeTile
          active={mode === "requirement"}
          icon={ClipboardList}
          title="Requirement-based"
          hint="Guided kW · ~2 min proposal"
          accent="bg-gradient-to-br from-emerald-500 to-teal-600"
          onSelect={() => onModeChange("requirement")}
        />
      </div>
    </div>
  );
}
