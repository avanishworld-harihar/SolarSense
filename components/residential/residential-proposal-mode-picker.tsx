"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ClipboardList, FileUp, Home, Sparkles, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type ResidentialInputMode = "bill" | "requirement";

const MODAL_Z = "z-[10050]";

function MethodCard({
  active,
  icon: Icon,
  title,
  headline,
  bullets,
  accent,
  glow,
  onSelect,
}: {
  active: boolean;
  icon: React.ElementType;
  title: string;
  headline: string;
  bullets: string[];
  accent: string;
  glow: string;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      layout
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
        active
          ? "border-emerald-300/80 bg-gradient-to-br from-emerald-50 via-white to-amber-50/80 shadow-lg ring-2 ring-emerald-400/25"
          : "border-white/20 bg-white/10 hover:border-emerald-200/50 hover:bg-white/15"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-60",
          glow
        )}
        aria-hidden
      />
      {active ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow"
        >
          <Check className="h-3.5 w-3.5 stroke-[3]" />
        </motion.div>
      ) : null}
      <div className={cn("relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md", accent)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="relative text-[10px] font-bold uppercase tracking-widest text-emerald-200/90">{title}</p>
      <h3 className="relative mt-1 text-lg font-bold text-white">{headline}</h3>
      <ul className="relative mt-3 space-y-1.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-xs text-slate-300/95">
            <Sun className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" aria-hidden />
            {b}
          </li>
        ))}
      </ul>
    </motion.button>
  );
}

type Props = {
  open: boolean;
  currentMode: ResidentialInputMode | null;
  onSelect: (mode: ResidentialInputMode) => void;
  onBack?: () => void;
};

export function ResidentialProposalModePicker({ open, currentMode, onSelect, onBack }: Props) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="res-mode-picker"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="res-mode-picker-title"
        className={cn(
          "proposal-os-glass-backdrop fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4",
          MODAL_Z
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="proposal-os-glass-sheet flex max-h-[min(96dvh,100%)] w-full max-w-2xl flex-col rounded-t-3xl sm:max-h-[min(88vh,800px)] sm:rounded-3xl"
        >
          <div className="proposal-os-glass-sheet-inner flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change proposal type
              </button>
            ) : null}

            <div className="mb-6 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                <Home className="h-3 w-3" />
                Residential Smart
              </div>
              <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
                <Sparkles className="h-3 w-3" />
                Choose generation method
              </div>
              <h2 id="res-mode-picker-title" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                How should we build this proposal?
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Pick the path that matches your customer conversation. You can switch later from the builder.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MethodCard
                active={currentMode === "bill"}
                icon={FileUp}
                title="Intelligent bill path"
                headline="Bill-Based Proposal"
                bullets={[
                  "Upload electricity bill — auto-fill consumption",
                  "Deep bill audit & monthly cost story",
                  "Subsidy + savings with verified usage",
                ]}
                accent="bg-gradient-to-br from-amber-500 to-orange-600"
                glow="bg-amber-400"
                onSelect={() => onSelect("bill")}
              />
              <MethodCard
                active={currentMode === "requirement"}
                icon={ClipboardList}
                title="Fast guided path"
                headline="Requirement-Based Proposal"
                bullets={[
                  "Enter kW, roof, brand & budget in ~2 minutes",
                  "Live panel count & EMI preview",
                  "Homeowner-friendly story — no bill needed",
                ]}
                accent="bg-gradient-to-br from-emerald-500 to-teal-600"
                glow="bg-emerald-400"
                onSelect={() => onSelect("requirement")}
              />
            </div>

            <p className="mt-5 text-center text-[11px] text-slate-500">
              Both paths generate the same premium residential web proposal — only the input method changes.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
