"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const JOURNEY_STEPS_BILL = [
  { id: "cover", label: "Start" },
  { id: "expertise", label: "Trust" },
  { id: "bill-audit", label: "Your bill" },
  { id: "economics", label: "Savings" },
  { id: "environment", label: "Impact" },
  { id: "technical-bom", label: "System" },
  { id: "survey", label: "Install" },
  { id: "amc", label: "Support" },
  { id: "commercial", label: "Pay" },
  { id: "closing", label: "Next" }
] as const;

const JOURNEY_STEPS_REQUIREMENT = [
  { id: "cover", label: "Start" },
  { id: "expertise", label: "Trust" },
  { id: "system-requirement", label: "Design" },
  { id: "environment", label: "Impact" },
  { id: "technical-bom", label: "System" },
  { id: "survey", label: "Install" },
  { id: "amc", label: "Support" },
  { id: "commercial", label: "Pay" },
  { id: "closing", label: "Next" }
] as const;

export function ProposalJourneyProgress({
  showSurvey,
  billAuditBacked = true,
  className
}: {
  showSurvey?: boolean;
  /** When false, bill audit + economics nav items are replaced by system design. */
  billAuditBacked?: boolean;
  className?: string;
}) {
  const base = billAuditBacked ? JOURNEY_STEPS_BILL : JOURNEY_STEPS_REQUIREMENT;
  const steps = base.filter((s) => s.id !== "survey" || showSurvey);

  return (
    <nav
      className={cn(
        "proposal-journey-progress proposal-journey-progress--responsive mb-4 overflow-x-auto rounded-2xl border px-2 py-2 sm:mb-6 print:hidden",
        className
      )}
      aria-label="Proposal sections"
    >
      <ol className="flex min-w-max items-center gap-0.5 sm:gap-1.5">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-center gap-0.5 sm:gap-1.5">
            <a
              href={`#journey-${step.id}`}
              className="proposal-journey-progress-link rounded-full px-2 py-1 text-[10px] font-semibold sm:px-3 sm:text-[11px]"
            >
              <span className="proposal-journey-progress-num mr-0.5 opacity-60 sm:mr-1">{i + 1}</span>
              <span className="proposal-journey-progress-label">{step.label}</span>
            </a>
            {i < steps.length - 1 ? (
              <span className="proposal-journey-progress-chevron hidden text-[10px] opacity-30 sm:inline" aria-hidden>
                ›
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ProposalJourneySection({
  id,
  children,
  className,
  noPad
}: {
  id: string;
  children: ReactNode;
  className?: string;
  noPad?: boolean;
}) {
  return (
    <section
      id={`journey-${id}`}
      className={cn(
        "proposal-journey-section proposal-rhythm-section scroll-mt-20 sm:scroll-mt-24",
        !noPad && "proposal-journey-section-pad",
        className
      )}
    >
      {children}
    </section>
  );
}

export function ProposalSectionHeader({
  kicker,
  title,
  subtitle,
  step,
  lang = "en"
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  step?: number;
  lang?: "en" | "hi";
}) {
  return (
    <header className="proposal-journey-header proposal-rhythm-header mb-5 sm:mb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45 }}
        className="flex flex-wrap items-center gap-2"
      >
        {step != null ? (
          <span className="proposal-journey-step-badge" aria-hidden>
            {String(step).padStart(2, "0")}
          </span>
        ) : null}
        <p
          className={cn(
            "text-xs font-semibold proposal-journey-kicker",
            lang === "hi" ? "tracking-normal" : "uppercase tracking-[0.2em]"
          )}
        >
          {kicker}
        </p>
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="proposal-journey-title mt-3 text-2xl font-bold tracking-tight sm:text-3xl"
      >
        {title}
      </motion.h2>
      {subtitle ? (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="proposal-journey-subtitle mt-2 max-w-2xl text-sm leading-relaxed sm:text-base"
        >
          {subtitle}
        </motion.p>
      ) : null}
    </header>
  );
}

export function JourneyBridge({ text, lang = "en" }: { text: string; lang?: "en" | "hi" }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.4 }}
      className="proposal-journey-bridge my-6 sm:my-8 print:hidden"
      role="note"
    >
      <p className={cn("text-sm font-medium leading-relaxed sm:text-[15px]", lang === "hi" && "tracking-normal")}>{text}</p>
    </motion.div>
  );
}

export function ProposalPanel({
  children,
  className,
  emphasis,
  variant = "surface"
}: {
  children: ReactNode;
  className?: string;
  emphasis?: "default" | "highlight" | "muted";
  /** surface = primary glass; nested = inside another panel; flat = low chrome */
  variant?: "surface" | "nested" | "flat";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.45 }}
      className={cn(
        "proposal-panel rounded-2xl p-4 sm:p-5 md:p-6",
        variant === "surface" && "proposal-panel--surface",
        variant === "nested" && "proposal-panel--nested",
        variant === "flat" && "proposal-panel--flat",
        emphasis === "highlight" && "proposal-panel--highlight",
        emphasis === "muted" && "proposal-panel--muted",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/** Hero savings strip — sits under cover metrics */
export function HeroSavingsRibbon({
  annualSaving,
  paybackYears,
  netCost,
  subsidy,
  labels
}: {
  annualSaving: number;
  paybackYears: number;
  netCost: number;
  subsidy: number;
  labels: { saving: string; payback: string; net: string; subsidy: string };
}) {
  const inr = (v: number) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`;
  return (
    <motion.div className="proposal-hero-ribbon proposal-hero-ribbon--responsive mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="proposal-hero-ribbon-tile proposal-hero-ribbon-tile--primary col-span-2 sm:col-span-1"
      >
        <p className="proposal-hero-ribbon-label">{labels.saving}</p>
        <p className="proposal-hero-ribbon-value">{inr(annualSaving)}</p>
        <p className="proposal-hero-ribbon-hint">per year</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.06 }}
        className="proposal-hero-ribbon-tile"
      >
        <p className="proposal-hero-ribbon-label">{labels.payback}</p>
        <p className="proposal-hero-ribbon-value">{paybackYears.toFixed(1)} yrs</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="proposal-hero-ribbon-tile"
      >
        <p className="proposal-hero-ribbon-label">{labels.net}</p>
        <p className="proposal-hero-ribbon-value">{inr(netCost)}</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.14 }}
        className="proposal-hero-ribbon-tile"
      >
        <p className="proposal-hero-ribbon-label">{labels.subsidy}</p>
        <p className="proposal-hero-ribbon-value">{inr(subsidy)}</p>
      </motion.div>
    </motion.div>
  );
}
