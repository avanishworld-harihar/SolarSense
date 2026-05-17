"use client";

import type { ReactNode } from "react";

import { WorkspaceStagger } from "@/components/workspace/workspace-stagger";
import { cn } from "@/lib/utils";
import { workspacePageClass, type WorkspacePageTone } from "@/lib/workspace-design";

export function WorkspacePage({
  tone,
  children,
  className,
  stagger = true
}: {
  tone: WorkspacePageTone;
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}) {
  const shell = cn(workspacePageClass(tone), className);
  if (!stagger) {
    return (
      <div className={shell}>{children}</div>
    );
  }
  return <WorkspaceStagger className={shell}>{children}</WorkspaceStagger>;
}

export { DashboardSectionTitle as WorkspaceSectionTitle } from "@/components/dashboard-section-title";
