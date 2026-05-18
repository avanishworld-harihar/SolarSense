"use client";

/**
 * WorkspacePill — active workspace / deal indicator in the TopBar.
 *
 * Shows a small animated pill that tells the user which deal is currently
 * "open" even when they navigate between modules. For example:
 *   - /proposal      → "Proposal Builder"
 *   - /proposals/123 → "Proposal"
 *   - /customers/456 → "Customer Profile"
 *   - /projects/789  → "Project"
 *
 * The pill auto-detects from pathname. Future phases (E5/E9) wire the
 * proposal builder and customer detail pages to call `setActiveWorkspace`
 * which overrides the pathname-based detection with richer data (customer
 * name, system size, etc.).
 *
 * Clicking the pill navigates back to the workspace.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, UserCircle, FolderOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShell, type WorkspaceType } from "@/lib/shell-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type PillData = {
  label: string;
  icon: LucideIcon;
  href: string;
  type: WorkspaceType;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const PILL_STYLES: Record<WorkspaceType, { pill: string; dot: string }> = {
  proposal: {
    pill: "border-emerald-200/90 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-400 dark:bg-emerald-400",
  },
  customer: {
    pill: "border-violet-200/90 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-500/10 dark:text-violet-300",
    dot: "bg-violet-400 dark:bg-violet-400",
  },
  project: {
    pill: "border-amber-200/90 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-400 dark:bg-amber-400",
  },
};

// ─── Pathname detection ───────────────────────────────────────────────────────

function detectFromPathname(pathname: string): PillData | null {
  if (pathname === "/proposal") {
    return { label: "Proposal Builder", icon: FileText, href: "/proposal", type: "proposal" };
  }
  if (/^\/proposals\/[^/]+/.test(pathname)) {
    return { label: "Proposal", icon: FileText, href: "/proposals", type: "proposal" };
  }
  if (/^\/customers\/[^/]+/.test(pathname)) {
    return { label: "Customer Profile", icon: UserCircle, href: "/customers", type: "customer" };
  }
  if (/^\/projects\/[^/]+/.test(pathname)) {
    return { label: "Project", icon: FolderOpen, href: "/projects", type: "project" };
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkspacePill({ className }: { className?: string }) {
  const pathname = usePathname();
  const { activeWorkspace } = useShell();

  const ws: PillData | null = activeWorkspace
    ? {
        label: activeWorkspace.label,
        href: activeWorkspace.href,
        type: activeWorkspace.type,
        icon:
          activeWorkspace.type === "proposal"
            ? FileText
            : activeWorkspace.type === "customer"
              ? UserCircle
              : FolderOpen,
      }
    : detectFromPathname(pathname);

  const styles = ws ? PILL_STYLES[ws.type] : null;

  return (
    <AnimatePresence>
      {ws && styles && (
        <motion.div
          initial={{ opacity: 0, scale: 0.88, x: 6 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.88, x: 6 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href={ws.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-opacity hover:opacity-80",
              styles.pill,
              className
            )}
            aria-label={`Active workspace: ${ws.label}. Click to return.`}
          >
            {/* Animated presence dot */}
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full animate-pulse",
                styles.dot
              )}
            />
            <ws.icon className="h-3 w-3 shrink-0" aria-hidden />
            <span>{ws.label}</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
