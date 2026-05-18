"use client";

/**
 * useCountUp — canonical count-up hook for SOL.52.
 *
 * Consolidates the two parallel implementations:
 *   - `useBlockCountUp` in proposal-block-utils.tsx  (residential blocks, rAF, print-safe)
 *   - `CountUp` component in commercial-shared.tsx   (commercial blocks, spring)
 *
 * This hook:
 *   ✓ Respects `prefers-reduced-motion` (snaps instantly)
 *   ✓ Snaps to final value on `beforeprint` (PDF/print fidelity)
 *   ✓ Skips animation on touch devices by default (configurable)
 *   ✓ Respects `data-ss-perf-mode="max-battery"` (skips animation)
 *   ✓ Uses a cubic-ease-out RAF animation (matches useBlockCountUp feel)
 *   ✓ Accepts optional duration override
 *   ✓ Does NOT depend on framer-motion (pure hooks)
 *
 * The original useBlockCountUp and CountUp component are NOT removed.
 * They continue to work. New components built in E1+ should import from here.
 *
 * Usage:
 *   const displayed = useCountUp(rawValue, { inView, format: (n) => `₹${n.toLocaleString("en-IN")}` });
 */

import { useEffect, useRef, useState } from "react";

export type CountUpOptions = {
  /**
   * Whether the element is in the viewport. Animation only starts when true.
   * Pass `true` to always animate on mount.
   */
  inView?: boolean;
  /**
   * Duration in milliseconds. Defaults to 950 (dashboard) or 1400 (deck).
   * Use DURATION.countUp or DURATION.countUpDeck from design-system.ts.
   */
  durationMs?: number;
  /**
   * Custom formatter applied to the animated numeric value.
   * Defaults to en-IN locale integer formatting.
   */
  format?: (value: number) => string;
  /**
   * When true, touch devices also animate (default false — skips on touch).
   * Set to true for commercial proposal KPI decks (presentation context).
   */
  animateOnTouch?: boolean;
  /**
   * Number of decimal places to retain during animation.
   * Defaults to 0 (integer).
   */
  decimals?: number;
};

function normalizeTarget(t: number): number {
  return Math.max(0, Number.isFinite(t) ? t : 0);
}

function shouldSkipAnimation(opts: { animateOnTouch: boolean }): boolean {
  if (typeof window === "undefined") return true;

  // prefers-reduced-motion
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return true;

  // Battery-saver performance mode
  const perfMode = document.documentElement.getAttribute("data-ss-perf-mode");
  if (perfMode === "max-battery") return true;

  // Touch device (unless caller opts in)
  if (!opts.animateOnTouch && (navigator.maxTouchPoints ?? 0) > 0) return true;

  return false;
}

/**
 * Returns a formatted string that counts up from 0 to `target`.
 * When not in view, returns the formatted final value (static).
 */
export function useCountUp(
  target: number,
  options: CountUpOptions = {}
): string {
  const {
    inView = true,
    durationMs = 950,
    format,
    animateOnTouch = false,
    decimals = 0,
  } = options;

  const safeTarget = normalizeTarget(target);
  const defaultFormat = (n: number) =>
    decimals > 0
      ? n.toFixed(decimals)
      : Math.round(n).toLocaleString("en-IN");
  const fmt = format ?? defaultFormat;

  const [value, setValue] = useState<string>(fmt(safeTarget));
  const rafRef = useRef<number>(0);

  // Print-safe: snap to final value immediately
  useEffect(() => {
    if (typeof window === "undefined") return;
    const snap = () => setValue(fmt(safeTarget));
    window.addEventListener("beforeprint", snap);
    const mq = window.matchMedia("print");
    const onPrint = () => { if (mq.matches) snap(); };
    mq.addEventListener("change", onPrint);
    if (mq.matches) snap();
    return () => {
      window.removeEventListener("beforeprint", snap);
      mq.removeEventListener("change", onPrint);
    };
  }, [safeTarget, fmt]);

  // Animation
  useEffect(() => {
    if (!inView) return;

    // Snap modes — set final value immediately, no RAF
    if (shouldSkipAnimation({ animateOnTouch })) {
      setValue(fmt(safeTarget));
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    let start: number | null = null;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      const current = eased * safeTarget;
      setValue(fmt(current));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(fmt(safeTarget));
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [inView, safeTarget, durationMs, animateOnTouch, fmt]);

  return value;
}

/**
 * useCountUpNumber — same as useCountUp but returns a raw number instead of a string.
 * Useful when you want to format the number yourself in JSX.
 */
export function useCountUpNumber(
  target: number,
  options: Omit<CountUpOptions, "format" | "decimals"> = {}
): number {
  const { inView = true, durationMs = 950, animateOnTouch = false } = options;

  const safeTarget = normalizeTarget(target);
  const [value, setValue] = useState<number>(safeTarget);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const snap = () => setValue(safeTarget);
    window.addEventListener("beforeprint", snap);
    const mq = window.matchMedia("print");
    const onPrint = () => { if (mq.matches) snap(); };
    mq.addEventListener("change", onPrint);
    if (mq.matches) snap();
    return () => {
      window.removeEventListener("beforeprint", snap);
      mq.removeEventListener("change", onPrint);
    };
  }, [safeTarget]);

  useEffect(() => {
    if (!inView) return;
    if (shouldSkipAnimation({ animateOnTouch })) {
      setValue(safeTarget);
      return;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    let start: number | null = null;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * safeTarget));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(safeTarget);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [inView, safeTarget, durationMs, animateOnTouch]);

  return value;
}
