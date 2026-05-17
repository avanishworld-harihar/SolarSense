"use client";

import { motion, useReducedMotion } from "framer-motion";
import { createElement, type ReactNode } from "react";

import { workspaceStaggerVariants } from "@/lib/workspace-design";
import { cn } from "@/lib/utils";

const stackClassName = (className?: string) =>
  cn("space-y-5 sm:space-y-6 md:space-y-7", className);

export function useWorkspaceMotionEnabled(): boolean {
  const reduced = useReducedMotion();
  if (reduced) return false;
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

export function WorkspaceStagger({ children, className }: { children: ReactNode; className?: string }) {
  const animate = useWorkspaceMotionEnabled();
  if (!animate) {
    return createElement("div", { className: stackClassName(className) }, children);
  }
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={workspaceStaggerVariants.root}
      className={stackClassName(className)}
    >
      {children}
    </motion.div>
  );
}

export function WorkspaceStaggerItem({
  children,
  className,
  as = "div"
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "p";
}) {
  const animate = useWorkspaceMotionEnabled();
  if (!animate) {
    if (as === "p") return <p className={className}>{children}</p>;
    return createElement("div", { className }, children);
  }
  if (as === "p") {
    return (
      <motion.p variants={workspaceStaggerVariants.item} className={className}>
        {children}
      </motion.p>
    );
  }
  return (
    <motion.div variants={workspaceStaggerVariants.item} className={className}>
      {children}
    </motion.div>
  );
}
