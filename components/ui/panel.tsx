"use client";

/**
 * Panel — unified glass/surface panel primitive.
 *
 * Consolidates the three parallel panel implementations found in the E0 audit:
 *   - `GlassPanel` in commercial-shared.tsx     (light white glass)
 *   - `DarkGlassPanel` in commercial-shared.tsx  (dark slate glass)
 *   - `BlockPanel` in proposal-block-utils.tsx   (light or dark via `dark` prop)
 *
 * Also covers the CSS utility families:
 *   .ss-card, .ss-card-subtle, .workspace-glass, .glass-panel-premium,
 *   .glass-panel-quiet, .glass-surface-subtle
 *
 * tone:
 *   "light"   — white glass card (default) — replaces GlassPanel light, BlockPanel light
 *   "dark"    — dark slate glass            — replaces DarkGlassPanel, BlockPanel dark
 *   "glass"   — premium workspace glass     — replaces .workspace-glass / .glass-panel-premium
 *   "subtle"  — quiet tinted panel          — replaces .glass-panel-quiet / .ss-card-subtle
 *
 * glow:
 *   When true, adds a sky-accented shadow ring (used by commercial KPI tiles).
 *
 * padding:
 *   "sm" | "md" | "lg" | "none" — maps to DS.pad.*
 *
 * All original components (GlassPanel, DarkGlassPanel, BlockPanel, CSS utilities)
 * remain in place. This component is for new surfaces in E1+.
 */

import { cn } from "@/lib/utils";
import { GLASS_TIER, PAD, SHADOW } from "@/lib/design-system";
import type { ReactNode } from "react";

/**
 * Panel tone options:
 *   "light"       — white glass card on light background
 *   "dark"        — dark slate glass on dark background
 *   "glass"       — heavy backdrop-blur workspace panel
 *   "subtle"      — quiet tinted panel
 *   "os-surface"  — Proposal OS surface tier (uses DS.glass.surface CSS class)
 *   "os-elevated" — Proposal OS elevated sheet tier (uses DS.glass.elevated CSS class)
 */
export type PanelTone = "light" | "dark" | "glass" | "subtle" | "os-surface" | "os-elevated";
export type PanelPadding = "none" | "sm" | "md" | "lg";

export interface PanelProps {
  children: ReactNode;
  /**
   * Surface tone.
   * "light"  — white/glass card on a light background
   * "dark"   — slate glass card on a dark background
   * "glass"  — heavy backdrop-blur (workspace hero panes)
   * "subtle" — quiet tinted panel
   */
  tone?: PanelTone;
  /** Adds a sky-blue glow ring for highlighted/active state */
  glow?: boolean;
  /**
   * Internal padding.
   * "sm"  = p-4 sm:p-5
   * "md"  = p-5 sm:p-6  (default)
   * "lg"  = p-6 sm:p-7 md:p-8
   * "none" = no padding
   */
  padding?: PanelPadding;
  className?: string;
  as?: React.ElementType;
}

const BASE_CLASSES: Record<PanelTone, string> = {
  light: cn(
    "overflow-hidden rounded-2xl border border-slate-200/80 bg-white",
    "shadow-[0_2px_24px_rgba(15,23,42,0.06)]"
  ),
  dark: cn(
    "overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm"
  ),
  glass: cn(
    "relative overflow-hidden rounded-[1.25rem]",
    "border border-white/55 backdrop-blur-xl backdrop-saturate-150",
    "bg-gradient-to-br from-sky-50/65 via-white/45 to-emerald-50/40",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_24px_rgba(11,34,64,0.06)]",
    "dark:border-white/10 dark:bg-slate-900/60 dark:backdrop-saturate-100"
  ),
  subtle: cn(
    "overflow-hidden rounded-[1.1rem]",
    "border border-white/55 bg-white/70",
    "dark:border-white/10 dark:bg-slate-800/60"
  ),
  // Proposal OS glass tiers — reference the CSS utility classes (see globals.css + GLASS_TIER tokens).
  // These keep all blur recipes in one place rather than scattered as inline values.
  "os-surface":  GLASS_TIER.surface,   // proposal-os-glass-card
  "os-elevated": GLASS_TIER.elevated,  // proposal-os-glass-sheet
};

const PAD_CLASSES: Record<PanelPadding, string> = {
  none: "",
  sm: PAD.cardSm,
  md: PAD.card,
  lg: PAD.cardLg,
};

const GLOW_CLASS = `shadow-[0_4px_32px_rgba(14,165,233,0.12)] border-sky-200/70`;

export function Panel({
  children,
  tone = "light",
  glow = false,
  padding = "md",
  className,
  as: Tag = "div",
}: PanelProps) {
  return (
    <Tag
      className={cn(
        BASE_CLASSES[tone],
        PAD_CLASSES[padding],
        glow && GLOW_CLASS,
        className
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * PanelRow — a horizontal divider row inside a Panel.
 * Renders a flex row with a subtle border separator.
 */
export function PanelRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3 last:border-b-0",
        "dark:border-white/5",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * PanelSection — a visually separated zone inside a Panel.
 * Use to group related fields / rows.
 */
export function PanelSection({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {title && (
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {title}
        </p>
      )}
      {children}
    </section>
  );
}
