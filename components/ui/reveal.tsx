"use client";

/**
 * Reveal — unified scroll-triggered fade + slide-up wrapper.
 *
 * Consolidates the two parallel reveal patterns found in the E0 audit:
 *   - `SectionReveal` in commercial-shared.tsx  (y: 32, easing [0.22, 1, 0.36, 1])
 *   - `BlockStatTile` motion wrapper             (y: 14, easing [0.21, 1.02, 0.73, 1])
 *   - `workspaceStaggerVariants.item`            (y: 12, ease "easeOut")
 *
 * density:
 *   "sm"  — workspace stagger items, y: 12  (subtle, fast)
 *   "md"  — residential block tiles, y: 20  (moderate)
 *   "lg"  — commercial section blocks, y: 32 (cinematic)
 *
 * Framer Motion's `reducedMotion="user"` handled automatically at the
 * MotionConfig level on the WebRenderer. Individual `Reveal` usage outside
 * a MotionConfig wrapper respects `useReducedMotion()` via the fallback check.
 *
 * The original SectionReveal and BlockStatTile motion wrapper remain in place.
 * New components built in E1+ should import Reveal from here.
 */

import { motion, useReducedMotion } from "framer-motion";
import { type Easing } from "framer-motion";
import { EASING, REVEAL_DISTANCE, DURATION } from "@/lib/design-system";
import type { ReactNode } from "react";

export type RevealDensity = "sm" | "md" | "lg";

export interface RevealProps {
  children: ReactNode;
  /**
   * "sm" — workspace stagger items (y: 12)
   * "md" — residential block tiles (y: 20)
   * "lg" — commercial section blocks (y: 32)  ← default
   */
  density?: RevealDensity;
  /** Stagger delay in seconds. 0 by default. */
  delay?: number;
  className?: string;
}

const DENSITY_CONFIG: Record<RevealDensity, {
  y: number;
  duration: number;
  ease: Easing | Easing[];
}> = {
  sm: { y: REVEAL_DISTANCE.sm, duration: DURATION.base / 1000, ease: EASING.standard },
  md: { y: REVEAL_DISTANCE.md, duration: DURATION.slow / 1000, ease: EASING.bounce },
  lg: { y: REVEAL_DISTANCE.lg, duration: DURATION.slow / 1000, ease: EASING.reveal },
};

export function Reveal({
  children,
  density = "lg",
  delay = 0,
  className,
}: RevealProps) {
  const reduced = useReducedMotion();
  const cfg = DENSITY_CONFIG[density];

  // When reduced motion is preferred, render children without animation
  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: cfg.y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-72px" }}
      transition={{ duration: cfg.duration, delay, ease: cfg.ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * RevealGroup — wraps children in a stagger container.
 * Each direct child that is a Reveal with density="sm" will receive a
 * staggered delay automatically.
 *
 * Use for grid / list reveals (e.g. KPI tile grids, proposal block lists).
 */
export function RevealGroup({
  children,
  stagger = 0.07,
  delayStart = 0,
  className,
}: {
  children: ReactNode;
  /** Delay between each child in seconds. Default 0.07s */
  stagger?: number;
  /** Initial delay before the first child starts */
  delayStart?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-48px" }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delayStart,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * RevealItem — use inside a RevealGroup to receive staggered animation.
 * Behaves like <Reveal density="sm"> but participates in the group stagger.
 */
export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: REVEAL_DISTANCE.sm },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: DURATION.base / 1000, ease: EASING.standard },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
