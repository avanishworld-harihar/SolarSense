"use client";

/**
 * ProposalPresetPicker — full-screen preset selection overlay.
 *
 * Appears on first load of the proposal builder. The user picks a proposal
 * "operating mode" before filling in customer data. Visual language is
 * premium and decisive — like choosing a product tier.
 *
 * Presets:
 *   residential_smart    — standard rooftop solar proposal with bill audit
 *   commercial_executive — high-impact commercial proposal with executive summary
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Home,
  Sparkles,
  Zap,
} from "lucide-react";

export type ProposalPresetId = "residential_smart" | "commercial_executive";

type Props = {
  currentPresetId: ProposalPresetId | null;
  onSelect: (id: ProposalPresetId) => void;
  onSkip: () => void;
};

type PresetDefinition = {
  id: ProposalPresetId;
  icon: React.ReactNode;
  badge: string;
  title: string;
  subtitle: string;
  audience: string;
  sections: string[];
  accentFrom: string;
  accentTo: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  ctaClass: string;
};

const PRESETS: PresetDefinition[] = [
  {
    id: "residential_smart",
    icon: <Home className="h-7 w-7" />,
    badge: "Residential Smart",
    title: "Residential Proposal",
    subtitle: "Complete rooftop solar proposal with bill audit, savings analysis, and payment terms.",
    audience: "Individual homeowners · Small rooftops · 1–10 kW",
    sections: [
      "Bill audit & monthly cost deep-dive",
      "25-year savings vs grid comparison",
      "System BOM & technical specifications",
      "Payment schedule & EMI calculator",
      "Environment impact (carbon offset)",
      "AMC & after-sales service plan",
    ],
    accentFrom: "from-amber-500",
    accentTo: "to-orange-600",
    borderColor: "border-amber-200/70",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    ctaClass:
      "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-amber-200",
  },
  {
    id: "commercial_executive",
    icon: <Building2 className="h-7 w-7" />,
    badge: "Commercial Executive",
    title: "Commercial Proposal",
    subtitle:
      "Executive-grade commercial solar proposal with financial intelligence and engineering rationale.",
    audience: "Businesses · Industries · Schools · 10 kW and above",
    sections: [
      "Executive summary with ROI headline",
      "System design & engineering rationale",
      "Financial intelligence (NPV / IRR / cashflow)",
      "DC/AC specifications & certifications",
      "Payment milestones & commercial terms",
      "Net-metering & DISCOM compliance",
    ],
    accentFrom: "from-sky-500",
    accentTo: "to-indigo-600",
    borderColor: "border-sky-200/70",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
    ctaClass:
      "bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:from-sky-600 hover:to-indigo-700 shadow-sky-200",
  },
];

/** Above `#ss-bottom-nav-portal` (z-index 9999) so modals fully cover mobile chrome. */
const MODAL_Z = "z-[10050]";

export function ProposalPresetPicker({ currentPresetId, onSelect, onSkip }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        key="preset-picker-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preset-picker-title"
        className={`proposal-os-glass-backdrop fixed inset-0 ${MODAL_Z} flex items-end justify-center p-0 sm:items-center sm:p-4`}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="proposal-os-glass-sheet flex max-h-[min(96dvh,100%)] w-full max-w-3xl flex-col rounded-t-3xl sm:max-h-[min(90vh,920px)] sm:rounded-3xl"
        >
          <div className="proposal-os-glass-sheet-inner flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-6">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-amber-400" />
              SOL.52 Proposal OS
            </div>
            <h2
              id="preset-picker-title"
              className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
            >
              Choose your proposal type
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Select the mode that matches your customer. You can change this at any time.
            </p>
          </div>

          {/* Preset cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {PRESETS.map((preset, i) => {
              const isSelected = currentPresetId === preset.id;
              return (
                <motion.button
                  key={preset.id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 + 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => onSelect(preset.id)}
                  className={`proposal-os-glass-card group w-full rounded-2xl p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 sm:p-6 ${
                    isSelected ? "proposal-os-glass-card--selected ring-2 ring-teal-400/30" : ""
                  }`}
                >
                  {/* Accent wash on hover */}
                  <div
                    className={`pointer-events-none absolute inset-0 z-0 bg-gradient-to-br ${preset.accentFrom} ${preset.accentTo} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.12]`}
                    aria-hidden
                  />

                  {/* Icon + badge */}
                  <div className="relative z-[1] mb-4 flex items-start justify-between">
                    <div
                      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${preset.accentFrom} ${preset.accentTo} p-3 text-white shadow-lg`}
                    >
                      {preset.icon}
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    )}
                  </div>

                  {/* Title + subtitle */}
                  <h3 className="relative z-[1] text-lg font-bold text-white">{preset.title}</h3>
                  <p className="relative z-[1] mt-1 text-sm leading-relaxed text-slate-300/95">
                    {preset.subtitle}
                  </p>

                  {/* Audience */}
                  <div className="relative z-[1] mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-200 backdrop-blur-sm">
                    <Zap className="h-2.5 w-2.5" aria-hidden />
                    {preset.audience}
                  </div>

                  {/* Included sections */}
                  <ul className="relative z-[1] mt-4 space-y-1.5">
                    {preset.sections.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-xs text-slate-300/90">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                        {s}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div
                    className={`relative z-[1] mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg backdrop-blur-sm transition-all ${preset.ctaClass}`}
                  >
                    Start Building
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Skip option */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-slate-400/90 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              Skip and use Residential Smart (default)
            </button>
          </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
