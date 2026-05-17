/**
 * SOL.52 workspace design tokens — extracted from the Dashboard command center.
 * Use for Customers, Projects, Proposals, More, and workflow pages (not public proposals).
 */

export const WORKSPACE_ICON_STROKE = 2.25 as const;

export type WorkspacePageTone = "customers" | "projects" | "proposals" | "settings" | "workflow";

export function workspacePageClass(tone: WorkspacePageTone, extra?: string): string {
  return ["workspace-page", `workspace-page--${tone}`, extra].filter(Boolean).join(" ");
}

export const workspaceStaggerVariants = {
  root: {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.03 }
    }
  },
  item: {
    visible: { opacity: 1, y: 0 },
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.38, ease: "easeOut" }
    }
  }
} as const;
