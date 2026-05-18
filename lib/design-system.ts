/**
 * SOL.52 Design System — E1 Token Layer
 *
 * Pure TypeScript constants and helper utilities.
 * No React, no JSX, no side-effects.
 *
 * Philosophy:
 *   "simple on the surface, powerful underneath"
 *
 * This file is the single source of truth for:
 *   - accent tone palettes (6 tones: sky/blue, emerald/green, amber, violet, rose, teal/solar)
 *   - typography scale tokens (named sizes for the de-facto values used across the codebase)
 *   - spacing rhythm tokens (card padding, section gaps)
 *   - motion constants (durations, easing curves)
 *   - surface tokens (glass classes, radius scale, elevation shadows)
 *   - preset semantic tokens (residential vs commercial accent/theme)
 *   - responsive container standards
 *
 * Usage:
 *   import { DS } from "@/lib/design-system";
 *   // DS.tone.sky.bg, DS.motion.easing.reveal, etc.
 *
 * Backward compatibility guarantee:
 *   This file only ADDS tokens. Existing `.ss-*`, `.glass-*`, `.workspace-*` CSS utility
 *   classes in globals.css are NOT removed. Existing component files (MetricCard,
 *   BlockStatTile, KpiCard, GlassPanel, etc.) remain unchanged.
 *   New primitives consume DS; old primitives will be migrated gradually (E3+).
 */

import { cn } from "@/lib/utils";

// ─── 1. Accent tone palette ────────────────────────────────────────────────────
//
// Single source of truth for the 6-tone map used by MetricCard, BlockStatTile,
// KpiCard, and per-component inline accent tables. All 6 tones have:
//   bg, border, label (small text), value (big number), icon, sub (secondary text)
//
// Light mode only. Dark-mode variants are on DSTone.dark (separate keys).
// "solar" tone = teal (SOL.52 brand primary energy color).
// "sky" tone = sky/blue (data, ROI, analytics).

export const TONE_KEYS = ["sky", "emerald", "amber", "violet", "rose", "solar"] as const;
export type ToneKey = (typeof TONE_KEYS)[number];

export type ToneSpec = {
  /** Card/tile light tinted background */
  bg: string;
  /** Card/tile border */
  border: string;
  /** Label text (small, uppercase eyebrow) */
  label: string;
  /** Hero value text (large number) */
  value: string;
  /** Icon color */
  icon: string;
  /** Sub-label / secondary text */
  sub: string;
  /** Icon well: background + ring (for IconWell component) */
  well: string;
};

/** Light-mode tone map — used by KpiTile "block" and "commercial" densities */
export const TONES: Record<ToneKey, ToneSpec> = {
  sky: {
    bg: "bg-gradient-to-br from-sky-50 to-sky-100/60",
    border: "border-sky-200/80",
    label: "text-sky-600",
    value: "text-sky-800",
    icon: "text-sky-500",
    sub: "text-sky-600/70",
    well: "bg-sky-100/90 text-sky-700 ring-sky-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
  },
  emerald: {
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/60",
    border: "border-emerald-200/80",
    label: "text-emerald-600",
    value: "text-emerald-800",
    icon: "text-emerald-500",
    sub: "text-emerald-600/70",
    well: "bg-emerald-100/90 text-emerald-700 ring-emerald-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-50 to-amber-100/60",
    border: "border-amber-200/80",
    label: "text-amber-600",
    value: "text-amber-800",
    icon: "text-amber-500",
    sub: "text-amber-600/70",
    well: "bg-amber-100/90 text-amber-800 ring-amber-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
  },
  violet: {
    bg: "bg-gradient-to-br from-violet-50 to-violet-100/60",
    border: "border-violet-200/80",
    label: "text-violet-600",
    value: "text-violet-800",
    icon: "text-violet-500",
    sub: "text-violet-600/70",
    well: "bg-violet-100/90 text-violet-700 ring-violet-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
  },
  rose: {
    bg: "bg-gradient-to-br from-rose-50 to-rose-100/60",
    border: "border-rose-200/80",
    label: "text-rose-600",
    value: "text-rose-800",
    icon: "text-rose-500",
    sub: "text-rose-600/70",
    well: "bg-rose-100/90 text-rose-700 ring-rose-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
  },
  solar: {
    bg: "bg-gradient-to-br from-teal-50 to-teal-100/60",
    border: "border-teal-200/80",
    label: "text-teal-600",
    value: "text-teal-800",
    icon: "text-teal-500",
    sub: "text-teal-600/70",
    well: "bg-teal-100/90 text-teal-800 ring-teal-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
  },
};

/** Dark-mode icon-well overrides — applied when the card is on a dark surface */
export const TONE_DARK_WELL: Record<ToneKey, string> = {
  sky:     "dark:bg-teal-500/18 dark:text-teal-100 dark:ring-teal-300/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_24px_rgba(45,212,191,0.35)]",
  emerald: "dark:bg-emerald-500/18 dark:text-emerald-100 dark:ring-emerald-300/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_26px_rgba(52,211,153,0.38)]",
  amber:   "dark:bg-amber-950/45 dark:text-amber-200 dark:ring-amber-700/35 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  violet:  "dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-700/35 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  rose:    "dark:bg-rose-950/45 dark:text-rose-200 dark:ring-rose-700/35 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  solar:   "dark:bg-teal-500/18 dark:text-teal-50 dark:ring-teal-300/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_26px_rgba(45,212,191,0.36)]",
};

/** Get the full Tailwind class string for an icon well (light + dark) */
export function toneWellClass(tone: ToneKey): string {
  return cn(TONES[tone].well, TONE_DARK_WELL[tone]);
}

// ─── 2. Typography scale tokens ────────────────────────────────────────────────
//
// Named aliases for the de-facto sizes used across the codebase.
// Only names what's already there — does not prescribe a new scale.

export const TYPE = {
  /** 10px — uppercase eyebrow / status label */
  caption: "text-[10px]",
  /** 11px — small pipeline / badge label */
  label: "text-[11px]",
  /** 13px — mid-size utility text between xs and sm */
  bodyMid: "text-[13px]",
  /** 0.9375rem ≈ 15px — comfortable body+, workspace sections */
  bodyPlus: "text-[0.9375rem]",
  /** Standard Tailwind scale (for reference, not re-exported) */
  xs: "text-xs",       // 12px
  sm: "text-sm",       // 14px
  base: "text-base",   // 16px (16.5 with root override)
  lg: "text-lg",       // 18px
  xl: "text-xl",       // 20px
  "2xl": "text-2xl",   // 24px
  "3xl": "text-3xl",   // 30px
  "4xl": "text-4xl",   // 36px
  "5xl": "text-5xl",   // 48px
  /** Hero stat number — commercial covers, KPI decks */
  heroStat: "text-4xl md:text-5xl",
  /** Card headline — workspace section titles */
  cardTitle: "text-lg sm:text-xl lg:text-[1.65rem] lg:leading-tight xl:text-[1.85rem]",
  /** Commercial section heading */
  commercialHeading: "text-3xl font-bold leading-[1.15] tracking-tight md:text-4xl lg:text-[2.75rem]",
} as const;

/** Letter-spacing tokens */
export const TRACKING = {
  /** Wide eyebrow — English uppercase labels */
  eyebrow: "tracking-[0.2em]",
  eyebrowWide: "tracking-[0.24em]",
  eyebrowTight: "tracking-[0.18em]",
  /** Tight — headings, value numbers */
  tight: "tracking-tight",
  tighterNum: "tracking-[-0.02em]",
  /** Tabular alignment — financial numbers */
  tabular: "tabular-nums",
} as const;

/** Font weight tokens */
export const WEIGHT = {
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
  /** Hero number weight — KPI decks, commercial covers */
  black: "font-black",
} as const;

// ─── 3. Spacing rhythm tokens ──────────────────────────────────────────────────

export const PAD = {
  /** Small card internal padding */
  cardSm: "p-4 sm:p-5",
  /** Standard card internal padding */
  card: "p-5 sm:p-6",
  /** Large card / section panel */
  cardLg: "p-6 sm:p-7 md:p-8",
  /** Quiet surface (mini card, inline panel) */
  quiet: "p-3 sm:p-4",
} as const;

export const GAP = {
  /** Between items in a chip / pill group */
  chips: "gap-1.5 sm:gap-2",
  /** Between cards in a row */
  cards: "gap-4 sm:gap-5",
  /** Between section-level blocks */
  sections: "gap-5 sm:gap-6 md:gap-7",
} as const;

export const SPACE_Y = {
  /** ss-page-shell rhythm */
  page: "space-y-5 sm:space-y-6 md:space-y-7",
  /** workspace-page rhythm (slightly larger) */
  workspace: "space-y-6 sm:space-y-7 md:space-y-8",
  /** Commercial section-to-section gap */
  commercial: "space-y-16 sm:space-y-20",
} as const;

// ─── 4. Motion tokens ─────────────────────────────────────────────────────────

/** Duration in milliseconds */
export const DURATION = {
  /** Instant UI feedback (hover, press) */
  fast: 200,
  /** Standard transition */
  base: 350,
  /** Reveal animation */
  slow: 600,
  /** Count-up animation — dashboard cards */
  countUp: 950,
  /** Count-up animation — proposal blocks */
  countUpDeck: 1400,
} as const;

/** Easing curves as Framer Motion arrays or strings */
export const EASING = {
  /** Smooth reveal — commercial blocks */
  reveal: [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** Gentle bounce — residential block tiles */
  bounce: [0.21, 1.02, 0.73, 1] as [number, number, number, number],
  /** Standard ease-out — workspace stagger */
  standard: "easeOut" as const,
  /** CSS easing — theme transitions */
  css: "ease-in-out" as const,
} as const;

/** Reveal slide distances (px) by density */
export const REVEAL_DISTANCE = {
  /** Workspace stagger items */
  sm: 12,
  /** Commercial KpiCard */
  md: 20,
  /** Commercial SectionReveal */
  lg: 32,
} as const;

// ─── 5. Surface tokens ────────────────────────────────────────────────────────

/** Border-radius scale — named aliases for the arbitrary radii used across the codebase */
export const RADIUS = {
  /** Icon wells, tiny chips */
  xs: "rounded-[0.65rem]",
  /** Standard card (1rem, same as rounded-lg) */
  card: "rounded-2xl",
  /** Workspace glass panels */
  panel: "rounded-[1.2rem]",
  /** Premium hero panels */
  hero: "rounded-[1.25rem]",
} as const;

/** Elevation shadow tokens */
export const SHADOW = {
  /** Subtle card lift */
  card: "shadow-[0_8px_24px_rgba(11,34,64,0.08)]",
  /** Light panel */
  panel: "shadow-[0_4px_24px_rgba(15,23,42,0.06)]",
  /** Accent glow (sky/sky KPI) */
  glowSky: "shadow-[0_4px_32px_rgba(14,165,233,0.10)]",
  /** Standard glass panel */
  glass: "shadow-[0_2px_24px_rgba(15,23,42,0.06)]",
  /** Float above content */
  float: "shadow-[0_12px_36px_rgba(11,34,64,0.14)]",
} as const;

/**
 * Glass surface class sets — all Tailwind classes needed to render a glass panel.
 * Use these instead of the CSS utilities when building new components outside globals.css.
 *
 * NOTE: The named globals.css classes (.workspace-glass, .glass-panel-premium, etc.)
 * remain in place. These TS constants are the canonical reference going forward.
 */
export const SURFACE = {
  /** Standard workspace glass (headers, workspace hero panes) */
  workspace: cn(
    "relative overflow-hidden border border-white/55 backdrop-blur-xl backdrop-saturate-150",
    "shadow-[0_8px_24px_rgba(11,34,64,0.06)]",
    "dark:border-white/10 dark:backdrop-saturate-100"
  ),
  /** Premium content card */
  card: cn(
    "rounded-[1.25rem] border border-white/40",
    "bg-gradient-to-br from-sky-50/65 via-white/45 to-emerald-50/40",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
    "backdrop-blur-md"
  ),
  /** Solid white card (stronger surface) */
  solidCard: cn(
    "rounded-[1.25rem] border border-white/60 bg-white/80 text-card-foreground"
  ),
  /** Light panel inside a card */
  quiet: cn(
    "rounded-[1.1rem] border border-white/55 bg-white/70"
  ),
  /** Commercial light panel */
  commercialLight: cn(
    "overflow-hidden rounded-2xl border border-slate-200/80 bg-white",
    "shadow-[0_2px_24px_rgba(15,23,42,0.06)]"
  ),
  /** Commercial dark panel */
  commercialDark: cn(
    "overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm"
  ),
} as const;

// ─── 6. Preset semantic tokens ────────────────────────────────────────────────
//
// These tokens are used by components that need to behave differently per preset.
// Commercial proposals: dark deck, large numbers, executive pacing.
// Residential proposals: light, warm, narrative pacing.
// Industrial (future E7): heavy data tables, utilitarian.

export type PresetId = "residential_smart" | "commercial_executive" | string;

export type PresetTheme = {
  /** Primary accent tone used for highlights */
  primaryTone: ToneKey;
  /** Secondary tone for charts/supplementary data */
  secondaryTone: ToneKey;
  /** "light" | "dark" — the surface mode for the proposal deck */
  deckMode: "light" | "dark";
  /** Spacing density for sections ("normal" or "large") */
  sectionSpacing: "normal" | "large";
  /** Font treatment for section headings */
  headingStyle: "balanced" | "impact";
};

export const PRESET_THEMES: Record<string, PresetTheme> = {
  residential_smart: {
    primaryTone: "sky",
    secondaryTone: "emerald",
    deckMode: "light",
    sectionSpacing: "normal",
    headingStyle: "balanced",
  },
  commercial_executive: {
    primaryTone: "sky",
    secondaryTone: "violet",
    deckMode: "dark",
    sectionSpacing: "large",
    headingStyle: "impact",
  },
  // Future presets — left extensible. Add entries here in E7.
  // industrial_capex: { primaryTone: "amber", secondaryTone: "rose", deckMode: "light", ... }
  // school_institution: { primaryTone: "violet", secondaryTone: "sky", deckMode: "light", ... }
} as const;

/** Get the preset theme; falls back to residential defaults for unknown presets */
export function getPresetTheme(presetId: PresetId): PresetTheme {
  return PRESET_THEMES[presetId] ?? PRESET_THEMES["residential_smart"];
}

// ─── 7. Responsive container standards ───────────────────────────────────────
//
// Canonical container widths used by AppShell, WorkspacePage, and public proposals.
// Use containerClass() instead of hard-coding these in component files.

export type ContainerSize = "full" | "workspace" | "page" | "proposal" | "narrow";

/**
 * Returns the canonical responsive container Tailwind classes for each context.
 *
 * "full"      — full-width with responsive horizontal padding (app shell inner content)
 * "workspace" — workspace pages: capped at 88rem, responsive vertical spacing
 * "page"      — public pages: capped at 7xl, suitable for long-form content
 * "proposal"  — public residential proposal: A4-locked at 210mm
 * "narrow"    — form/admin context: capped at 2xl
 */
export function containerClass(size: ContainerSize, extra?: string): string {
  const bases: Record<ContainerSize, string> = {
    full:      "mx-auto w-full max-w-full px-3 sm:px-4 md:px-5 lg:max-w-6xl lg:px-6 xl:max-w-7xl 2xl:px-8",
    workspace: "relative mx-auto w-full min-w-0 max-w-[88rem]",
    page:      "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
    proposal:  "mx-auto w-full max-w-[210mm] px-4 sm:px-8",
    narrow:    "mx-auto w-full max-w-2xl px-4 sm:px-6",
  };
  return cn(bases[size], extra);
}

// ─── 8. Breakpoint reference (informational, not Tailwind config) ─────────────

/** Named breakpoints for documentation and runtime checks (do not use for CSS) */
export const BREAKPOINTS = {
  sm: 640,   // large phone / small tablet
  md: 768,   // iPad portrait
  lg: 1024,  // iPad landscape / small laptop
  xl: 1280,  // standard desktop
  "2xl": 1536,
} as const;

// ─── 9. Design system barrel ─────────────────────────────────────────────────
//
// Single re-export object for convenient destructuring:
//   import { DS } from "@/lib/design-system";
//   DS.tone.sky.bg, DS.motion.duration.slow, etc.

export const DS = {
  tone: TONES,
  toneDark: TONE_DARK_WELL,
  toneWell: toneWellClass,
  type: TYPE,
  tracking: TRACKING,
  weight: WEIGHT,
  pad: PAD,
  gap: GAP,
  spaceY: SPACE_Y,
  duration: DURATION,
  easing: EASING,
  revealDistance: REVEAL_DISTANCE,
  radius: RADIUS,
  shadow: SHADOW,
  surface: SURFACE,
  presetTheme: getPresetTheme,
  container: containerClass,
  breakpoint: BREAKPOINTS,
} as const;
