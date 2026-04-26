"use client";

import { useSyncExternalStore } from "react";

/**
 * Single subscription for pipeline / dashboard project cards.
 * Previously every GlassProjectCard registered matchMedia + resize (N× listeners on Projects).
 */
function computeTouchExpansionMode(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  const coarseQuery = window.matchMedia("(pointer: coarse), (any-pointer: coarse)");
  const fineQuery = window.matchMedia("(hover: hover) and (pointer: fine), (any-hover: hover) and (any-pointer: fine)");
  const hasFine = fineQuery.matches;
  const coarse = coarseQuery.matches;
  const mobileUaRe = /android|iphone|ipad|ipod|mobile/i;
  const isMobileUa = mobileUaRe.test(navigator.userAgent);
  const wideDesktop = window.innerWidth >= 1024;
  if (hasFine) return false;
  return coarse && (isMobileUa || !wideDesktop);
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const coarseQuery = window.matchMedia("(pointer: coarse), (any-pointer: coarse)");
  const fineQuery = window.matchMedia("(hover: hover) and (pointer: fine), (any-hover: hover) and (any-pointer: fine)");
  const onResize = () => onStoreChange();
  const onMq = () => onStoreChange();
  coarseQuery.addEventListener?.("change", onMq);
  fineQuery.addEventListener?.("change", onMq);
  window.addEventListener("resize", onResize, { passive: true });
  return () => {
    coarseQuery.removeEventListener?.("change", onMq);
    fineQuery.removeEventListener?.("change", onMq);
    window.removeEventListener("resize", onResize);
  };
}

export function useProjectCardTouchMode(): boolean {
  return useSyncExternalStore(subscribe, computeTouchExpansionMode, () => false);
}
