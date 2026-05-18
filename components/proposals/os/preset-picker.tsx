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

export function ProposalPresetPicker({ currentPresetId, onSelect, onSkip }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        key="preset-picker-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-3xl"
        >
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              <Sparkles className="h-3 w-3 text-amber-400" />
              SOL.52 Proposal OS
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
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
                  className={`group relative w-full overflow-hidden rounded-2xl border bg-white/5 p-6 text-left backdrop-blur-sm transition-all duration-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                    isSelected
                      ? "border-white/40 ring-2 ring-white/20"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  {/* Background gradient on hover */}
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${preset.accentFrom} ${preset.accentTo} opacity-0 transition-opacity duration-300 group-hover:opacity-5`}
                  />

                  {/* Icon + badge */}
                  <div className="mb-4 flex items-start justify-between">
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
                  <h3 className="text-lg font-bold text-white">{preset.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {preset.subtitle}
                  </p>

                  {/* Audience */}
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
                    <Zap className="h-2.5 w-2.5" />
                    {preset.audience}
                  </div>

                  {/* Included sections */}
                  <ul className="mt-4 space-y-1.5">
                    {preset.sections.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                        {s}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div
                    className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg transition-all ${preset.ctaClass}`}
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
              className="text-xs text-slate-500 underline-offset-2 transition-colors hover:text-slate-300 hover:underline"
            >
              Skip and use Residential Smart (default)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
