"use client";

/**
 * SectionHeader — unified section heading primitive.
 *
 * Consolidates three parallel implementations from the E0 audit:
 *   1. `SectionHeader` in proposal-view.tsx           (residential sections, lang + darkMode)
 *   2. `BlockSectionTitle` in proposal-block-utils.tsx (residential extracted blocks)
 *   3. `CommercialSectionHeader` in commercial-shared.tsx (commercial blocks, section number)
 *
 * variant:
 *   "residential"  — `BlockSectionTitle` style: kicker + title + optional subtitle
 *                    Suitable for residential proposal sections and workspace page headers.
 *   "commercial"   — `CommercialSectionHeader` style: section number · rule · label tag + title
 *                    Suitable for commercial executive proposal sections.
 *
 * The Reveal animation is baked in for commercial variant (matching the original
 * CommercialSectionHeader). Residential variant has no built-in animation so it
 * can be composed with <Reveal> externally where needed.
 *
 * Original components remain unchanged. New surfaces in E1+ should use this.
 */

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { EyebrowLang } from "@/components/ui/eyebrow";

export type SectionHeaderVariant = "residential" | "commercial";

export interface SectionHeaderProps {
  /**
   * "residential" — kicker + title + subtitle (warm, narrative feel)
   * "commercial"  — section number · rule · label tag + large title (executive feel)
   */
  variant?: SectionHeaderVariant;
  /** Section number for commercial variant (e.g. "01", "02") */
  num?: string;
  /** Small uppercase label / kicker text */
  label?: string;
  /** Primary heading */
  title: string;
  /** Optional secondary line below title */
  subtitle?: string;
  /** Dark surface mode (commercial dark backgrounds) */
  dark?: boolean;
  /** Language hint — adjusts tracking for Devanagari */
  lang?: EyebrowLang;
  className?: string;
}

// ─── Residential ─────────────────────────────────────────────────────────────

function ResidentialHeader({
  label,
  title,
  subtitle,
  dark = false,
  lang = "en",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-6 sm:mb-8", className)}>
      {label ? (
        <Eyebrow lang={lang} dark={dark} className="mb-2">
          {label}
        </Eyebrow>
      ) : null}
      <h2
        className={cn(
          "text-balance text-2xl font-bold tracking-tight sm:text-3xl",
          dark ? "text-white" : "text-slate-900"
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={cn(
            "mt-2 text-sm sm:text-base",
            dark ? "text-slate-400" : "text-slate-600"
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// ─── Commercial ──────────────────────────────────────────────────────────────

function CommercialHeader({
  num,
  label,
  title,
  subtitle,
  className,
}: SectionHeaderProps) {
  return (
    <Reveal density="lg" className={cn("mb-12", className)}>
      {/* Section number + rule + label tag */}
      <div className="mb-5 flex items-center gap-4">
        {num && (
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-slate-300 tabular-nums">
            {num}
          </span>
        )}
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
        {label && (
          <span className="rounded-full border border-sky-200/80 bg-sky-50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-600">
            {label}
          </span>
        )}
      </div>

      {/* Title */}
      <h2 className="text-3xl font-bold leading-[1.15] tracking-tight text-slate-900 md:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-500">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

// ─── Unified export ───────────────────────────────────────────────────────────

export function SectionHeader({
  variant = "residential",
  ...props
}: SectionHeaderProps) {
  if (variant === "commercial") {
    return <CommercialHeader variant="commercial" {...props} />;
  }
  return <ResidentialHeader variant="residential" {...props} />;
}
