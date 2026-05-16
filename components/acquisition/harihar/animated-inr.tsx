"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "framer-motion";

type AnimatedInrProps = {
  value: number;
  className?: string;
  /** Fraction digits for values under 100 (e.g. payback). */
  decimals?: number;
};

export function AnimatedInr({ value, className, decimals = 0 }: AnimatedInrProps) {
  const mv = useMotionValue(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(mv, value, {
      type: "spring",
      stiffness: 90,
      damping: 22,
      mass: 0.8
    });
    return () => controls.stop();
  }, [value, mv]);

  useMotionValueEvent(mv, "change", (v) => {
    const el = spanRef.current;
    if (!el) return;
    if (decimals > 0 && Math.abs(value) < 100) {
      el.textContent = v.toFixed(decimals);
    } else {
      el.textContent = Math.round(v).toLocaleString("en-IN");
    }
  });

  return (
    <span className={className} ref={spanRef}>
      {decimals > 0 && Math.abs(value) < 100 ? value.toFixed(decimals) : Math.round(value).toLocaleString("en-IN")}
    </span>
  );
}
