"use client";

/**
 * IconWell — unified tinted icon container.
 *
 * Consolidates the two parallel icon-well implementations:
 *   - `iconToneStyles` lookup table in metric-card.tsx (6-tone with dark variants)
 *   - `.ws-icon-well`, `.ws-icon-well--{tone}` CSS utility classes in globals.css
 *     (10 tones: sky, emerald, amber, teal, violet, rose, indigo, orange, + more)
 *
 * size:
 *   "sm"  — 32px (small inline use, nav icons)
 *   "md"  — 40px (standard metric card, default)
 *   "lg"  — 44px (hero metric cards, large panels)
 *
 * tone:
 *   All 6 DS tone keys supported. Dark-mode variants included automatically.
 *
 * Existing `iconToneStyles` in metric-card.tsx and `.ws-icon-well--*` CSS classes
 * remain unchanged. This component is for new surfaces in E1+.
 */

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneWellClass, type ToneKey } from "@/lib/design-system";

export type IconWellSize = "sm" | "md" | "lg";

export interface IconWellProps {
  icon: LucideIcon;
  tone?: ToneKey;
  size?: IconWellSize;
  className?: string;
  /** Accessible label. Defaults to aria-hidden if not provided. */
  label?: string;
  /** Icon stroke width. Defaults to 2.25 (SOL.52 standard) */
  strokeWidth?: number;
}

const SIZE_CLASSES: Record<IconWellSize, { well: string; icon: string }> = {
  sm: {
    well: "h-8 w-8 rounded-[0.65rem]",
    icon: "h-4 w-4",
  },
  md: {
    well: "h-10 w-10 rounded-xl sm:h-11 sm:w-11",
    icon: "h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]",
  },
  lg: {
    well: "h-11 w-11 rounded-xl sm:h-12 sm:w-12",
    icon: "h-[1.35rem] w-[1.35rem] sm:h-6 sm:w-6",
  },
};

export function IconWell({
  icon: Icon,
  tone = "sky",
  size = "md",
  className,
  label,
  strokeWidth = 2.25,
}: IconWellProps) {
  const sc = SIZE_CLASSES[size];

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center ring-1 backdrop-blur-sm",
        sc.well,
        toneWellClass(tone),
        className
      )}
      aria-hidden={!label}
      aria-label={label}
    >
      <Icon className={sc.icon} strokeWidth={strokeWidth} />
    </span>
  );
}
