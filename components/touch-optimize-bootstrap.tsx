"use client";

import { useEffect } from "react";

const ATTR = "data-ss-touch-optimize";

function shouldTouchOptimize(): boolean {
  if (typeof window === "undefined") return false;
  if ((navigator.maxTouchPoints ?? 0) > 0) return true;
  if ("ontouchstart" in window) return true;
  return window.matchMedia("(pointer: coarse), (hover: none)").matches;
}

/**
 * Marks the document root on real touch / coarse-pointer devices so CSS can drop
 * expensive full-frame blurs (iPad Chrome jank, missed taps while compositing).
 */
export function TouchOptimizeBootstrap() {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      if (shouldTouchOptimize()) root.setAttribute(ATTR, "");
      else root.removeAttribute(ATTR);
    };
    sync();
    const mq = window.matchMedia("(pointer: coarse), (hover: none)");
    const onMq = () => sync();
    mq.addEventListener?.("change", onMq);
    return () => mq.removeEventListener?.("change", onMq);
  }, []);

  return null;
}
