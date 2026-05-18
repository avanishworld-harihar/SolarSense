"use client";

/**
 * Eyebrow — unified uppercase label / kicker primitive.
 *
 * Consolidates three parallel implementations from the E0 audit:
 *   - `BlockKicker` in proposal-block-utils.tsx  (Hindi-conditional tracking)
 *   - `.ss-card-eyebrow`, `.workspace-type-eyebrow`, `.ss-step-chip` CSS classes
 *   - Inline `text-[10px] font-bold uppercase tracking-[0.2em]` patterns (~30+ files)
 *
 * Key behaviors:
 *   - Automatically drops `uppercase` + wide `tracking` when `lang === "hi"`
 *     (Devanagari uppercase does not exist; wide tracking breaks ligatures)
 *   - Two sizes: "xs" (10px default) and "sm" (11–12px)
 *   - "dark" prop for use on dark proposal surfaces
 *   - Accepts tone coloring from the DS tone set
 *
 * The original BlockKicker and CSS eyebrow utilities remain in place.
 * New components in E1+ should import Eyebrow from here.
 */

import { cn } from "@/lib/utils";
import { TONES, type ToneKey } from "@/lib/design-system";

export type EyebrowSize = "xs" | "sm";
export type EyebrowLang = "en" | "hi" | string;

export interface EyebrowProps {
  children: React.ReactNode;
  /**
   * Language hint — adjusts tracking and uppercase for Devanagari.
   * "hi" disables uppercase and wide tracking (Devanagari convention).
   * Defaults to "en".
   */
  lang?: EyebrowLang;
  /**
   * "xs" = 10px (default, standard eyebrow for metric labels)
   * "sm" = 11–12px (slightly larger, workspace section labels)
   */
  size?: EyebrowSize;
  /**
   * When true, renders on a dark surface (teal accent, lighter text).
   */
  dark?: boolean;
  /**
   * Optional tone for accent coloring. When set, overrides the default slate text.
   * Use sparingly (e.g. when the eyebrow is a colored category tag).
   */
  tone?: ToneKey;
  className?: string;
  as?: React.ElementType;
}

const SIZE_BASE: Record<EyebrowSize, string> = {
  xs: "text-[10px]",
  sm: "text-[11px] sm:text-xs",
};

function trackingClasses(lang: EyebrowLang, size: EyebrowSize): string {
  if (lang === "hi") {
    // Devanagari: no uppercase, normal tracking
    return "tracking-normal normal-case";
  }
  // English: uppercase + wide tracking (size-dependent tightness)
  return size === "xs"
    ? "uppercase tracking-[0.2em]"
    : "uppercase tracking-[0.18em]";
}

function colorClasses(dark: boolean, tone?: ToneKey): string {
  if (tone) {
    return dark ? TONES[tone].label.replace("text-", "text-").replace("-600", "-300") : TONES[tone].label;
  }
  return dark ? "text-sky-400" : "text-slate-500 dark:text-slate-400";
}

export function Eyebrow({
  children,
  lang = "en",
  size = "xs",
  dark = false,
  tone,
  className,
  as: Tag = "p",
}: EyebrowProps) {
  return (
    <Tag
      className={cn(
        "font-bold leading-tight",
        SIZE_BASE[size],
        trackingClasses(lang, size),
        colorClasses(dark, tone),
        className
      )}
    >
      {children}
    </Tag>
  );
}
